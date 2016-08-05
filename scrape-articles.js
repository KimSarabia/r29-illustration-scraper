"use strict";

const config = require("./config")
    , fsFileTree = require("fs-file-tree")
    , readJson = require("r-json")
    , writeJson = require("w-json")
    , oneByOne = require("one-by-one")
    , sameTimeLimit = require("same-time-limit")
    , bindy = require("bindy")
    , scrapeIt = require("scrape-it")
    , request = require("tinyreq")
    ;

let articles = fsFileTree.sync(config.articlesDir)
  , fileNames = Object.keys(articles) //.map(k => articles[k].path)
  ;

function getArticleData(cUrl, cb) {
    console.log(`GET ${cUrl}`);
    request(cUrl, (err, body) => {
        if (err) { return cb(err); }
        let startIndex = body.indexOf("window.entry = ") + 15;
        let endIndex = body.indexOf("var disqus_url = '", startIndex);
        var data = body.substring(startIndex, endIndex).trim().slice(0, -1);
        try {
            data = JSON.parse(data);
        } catch (err) {
            return cb(err);
        }
        cb(null, data);
    });
}

// Iterate the files
oneByOne(bindy(fileNames, (cFilename, next) => {
    let articleUrls = readJson(articles[cFilename].path);
    sameTimeLimit(bindy(articleUrls, (cUrl, done) => {
        getArticleData(cUrl, (err, data) => {
            if (err) {
                console.log(`>> Error: ${cUrl}`);
                console.log(">> Error", err);
                return done(null, []);
            }
            if (data.sections.slideshow) {
                data.sections.body = data.sections.body.concat(data.sections.slideshow);
            }
            let images = data.sections.body.filter(
                c => c.content && /Illustrated by: /.test(c.content.credit)
            ).map(c => ({
                by: c.content.credit.split("by: ")[1]
              , url: c.content.resource
            }));
            done(null, images);
        });
    }), 1, (err, data) => {
        let all = [];
        data.forEach(c => all = all.concat(c));
        console.log(`Done ${cFilename}`);
        writeJson(`${config.outputDir}/${cFilename}`, all, next);
    });
}), (err, data) => {
    console.log("Done.");
});
