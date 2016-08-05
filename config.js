module.exports = {
    start: {
        year: 2016
      , month: 4
    }
  , end: {
        year: new Date().getFullYear()
      , month: new Date().getMonth() + 1
    }
  , articleUrlFormat: "http://www.refinery29.com/sitemap/month/{year}-{month}.xml"
  , articlesDir: "./articles/"
  , outputDir: "./image-urls/"
};
