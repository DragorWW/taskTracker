var gulp = require('gulp');
var webpack = require('webpack');
var path = require('path');
var fs = require('fs');
var DeepMerge = require('deep-merge');
var nodemon = require('nodemon');
var WebpackDevServer = require('webpack-dev-server');

var deepmerge = DeepMerge(function(target, source, key) {
    if(target instanceof Array) {
        return [].concat(target, source);
    }
    return source;
});

// generic

var defaultConfig = {
};

if(process.env.NODE_ENV !== 'production') {
    //defaultConfig.devtool = '#eval-source-map';
    defaultConfig.devtool = 'source-map';
    defaultConfig.debug = true;
}

function config(overrides,mergeConfig) {
    mergeConfig = mergeConfig || defaultConfig;
    return deepmerge(defaultConfig, overrides || {});
}


var nodeModules = {};
fs.readdirSync('node_modules')
    .filter(function(x) {
        return ['.bin'].indexOf(x) === -1;
    })
    .forEach(function(mod) {
        nodeModules[mod] = 'commonjs ' + mod;
    });

var backendConfig = config({
    entry: [
        './src/main.js'
    ],
    target: 'node',
    output: {
        path: path.join(__dirname, 'dist'),
        filename: 'taskTracker.js'
    },
    node: {
        __dirname: true,
        __filename: true
    },
    externals: nodeModules,
    module: {
        loaders: [
            {test: /\.js$/, exclude: /node_modules/, loaders: ['babel'] }
        ]
    },
    plugins: [
        new webpack.IgnorePlugin(/\.(css|less)$/),
    ]
});
if(process.env.NODE_ENV !== 'production') {
    backendConfig = config({
        entry: [
            'webpack/hot/signal.js',
            './src/main.js'
        ],
        recordsPath: path.join(__dirname, 'dist/_records'),
        module: {
            loaders: [
                {test: /\.js$/, exclude: /node_modules/, loaders: ['monkey-hot', 'babel'] }
            ]
        },
        plugins: [
            new webpack.IgnorePlugin(/\.(css|less)$/),
            new webpack.BannerPlugin('require("source-map-support").install();',
                { raw: true, entryOnly: false }),
            new webpack.HotModuleReplacementPlugin({ quiet: true })
        ]
    });
}


// tasks

function onBuild(done) {
    return function(err, stats) {
        if(err) {
            console.log('Error', err);
        }
        else {
            console.log(stats.toString());
        }

        if(done) {
            done();
        }
    };
}


gulp.task('build', function(done) {
    webpack(backendConfig).run(onBuild(done));
});

gulp.task('watch', function(done) {
    var firedDone = false;
    webpack(backendConfig).watch(100, function(err, stats) {
        if(!firedDone) {
            firedDone = true;
            done();
        }

        nodemon.restart();
    });
});


gulp.task('run', ['watch'], function() {
    nodemon({
        execMap: {
            js: 'node'
        },
        script: path.join(__dirname, 'src'),
        ignore: ['*'],
        watch: ['foo/'],
        ext: 'noop'
    }).on('restart', function() {
        console.log('Patched!');
    });
});