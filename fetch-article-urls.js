"use strict";

const config = require("./config")
    , LimitIt = require("limit-it")
    , writeJson = require("w-json")
    , fillo = require("fillo")
    , barbe = require("barbe")
    , request = require("tinyreq")
    , xml2json = require("xml-jsonify")
    ;

const ARTICLES_DIR = config.articlesDir;
const limiter = new LimitIt(1);

function getXML(url, cb, retry) {
    if (retry === 0) {
        return cb(new Error(`Failed to load the data from url ${url}`));
    }

    retry = retry || 3;

    request(url, (err, body) => {
        if (err) { return cb(err); }
        body = body.trim();
        if (body.endsWith("urlset>")) {
            return cb(null, body);
        }
        setTimeout(function() {
            console.log(`RETRY > ${url}`);
            getXML(url, cb, retry - 1);
        }, 1000);
    });
}

let tasks = [];
for (let year = config.start.year; year <= config.end.year; ++year) {
    let startMonth = year === config.start.year ? config.start.month : 1;
    let endMonth = year === config.end.year ? config.end.month : 12;
    for (let month = startMonth; month <= endMonth; ++month) {
        let url = barbe(config.articleUrlFormat, {
            year: year
          , month: fillo(month)
        });
        limiter.add(cb => {
            console.log(`GET ${url}`);
            getXML(url, (err, body) => {
                if (err) {
                    console.log(`>> Error: ${url}`);
                    console.log(">> Error", err);
                    return cb(null, []);
                }

                xml2json(body, (err, json) => {
                    if (err) {
                        console.log(`>> Error: ${url}`);
                        console.log(">> Error when parsing the XML", err);
                        return cb(null, []);
                    }

                    let articleList = json.url.map(c => c.loc)
                      , jsonPath = `${ARTICLES_DIR}/${year}-${month}.json`
                      ;

                    writeJson(jsonPath, articleList, (err, data) => {
                        if (err) {
                            console.log(`Failed to write the json file: ${jsonPath}`);
                        }
                        cb();
                    });
                });
            });
        }, (err, data) => {
            console.log(`Finished ${url}`);
        });
    }
}
