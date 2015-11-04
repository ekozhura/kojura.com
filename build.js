var Metalsmith = require('metalsmith'),
    markdown = require('metalsmith-markdownit'),
    layouts = require('metalsmith-layouts'),
    less = require('metalsmith-less')
    ;
var metalsmith = Metalsmith(__dirname)
    .use(markdown())
    .use(layouts('handlebars'))
    .use(less({
        pattern: "templates/less/*.less"
    }))
    .build(function(err){
        if (err) throw err;
    });
