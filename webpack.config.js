module.exports = {
    entry: './src/client/hashtagApp.js',
    output: { 
        path: __dirname + "/public/js",
        filename: 'bundle.js'
    },
    module: {
         loaders: [
        {
             test: /\.js$/,
             exclude: /node_modules/,
             loader: 'babel-loader'
         }, { test: /\.css$/, 
            exclude: /node_modules/,
            loader: "style-loader!css-loader" 
         },
         { test: /\.html$/, loader: "html-loader", exclude: /node_modules/ }
    ]
     }
};
