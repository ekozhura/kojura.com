var Metalsmith = require('metalsmith'),
    markdown = require('metalsmith-markdownit'),
    layouts = require('metalsmith-layouts'),
    less = require('metalsmith-less'),
    collections = require('metalsmith-collections'),
    permalinks = require('metalsmith-permalinks')
    ;

var md = markdown('default', {
    typographer: true,
    html: true
});
md.parser.enable(['emphasis', 'html_block']);
md.parser.use(require('markdown-it-footnote'));
md.parser.use(require('markdown-it-highlightjs'));

var metalsmith = Metalsmith(__dirname)
    .metadata({
        base_url: "http://kojuro.com/",
        home_page: "http://kojuro.com/",
        blog_archive: "blog/",
        twitter_link: "https://twitter.com/brutallo",
        github_link: "https://github.com/ekozhura",
        linkedin_link: "https://www.linkedin.com/pub/evgeny-kozhura/b8/262/224"
    })
    .use(md)
    .use(collections({
        posts: {
            pattern: './src/blog/**.md',
            sortBy: 'date',
            reverse: true
        }
    }))
    .use(permalinks("blog/:alias"))
    .use(layouts({
        engine: 'handlebars',
        directory: './layouts'
    }))
    .use(less())
    .destination('./build')
    .build(function(err){
        if (err) throw err;
    });
