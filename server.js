"use strict";

var express = require('express');
var app = express();
var bodyParser = require('body-parser');
var jsdom = require("jsdom");
var Crawler = require("crawler");
var url = require('url');
var request = require('request');
var fs = require('fs');
var converter = require('json-2-csv');
var mongoose = require('mongoose');
var db = mongoose.connect('mongodb://localhost:27017/instagram-scrapper');
var instagram = require('instagram-nodejs-without-api')
require('./models/user.model');
var User = mongoose.model('User');
var followersFiltered;

app.use(express.static(__dirname + '/public'));

app.use(bodyParser.json({limit: '50mb'}));
app.use(bodyParser.urlencoded({limit: '50mb', extended: false}));

// parse application/json
app.use(bodyParser.json());

//if (!process.argv[2]) throw 'You must specify a web page!';

var c = new Crawler({
    maxConnections : 10,
    callback : function (error, result, $) {
        $('a').each( function(index, a) {
            var toQueueUrl = $(a).attr('href');
            c.queue(toQueueUrl);
        });
    }
});

//var host = 'https://api.instagram.com/query/?q=ig_user(559802352)+%7B%0A++followed_by.first(100)+%7B%0A++++count%2C%0A++++page_info+%7B%0A++++++end_cursor%2C%0A++++++has_next_page%0A++++%7D%2C%0A++++nodes+%7B%0A++++++id%2C%0A++++++is_verified%2C%0A++++++followed_by_viewer%2C%0A++++++requested_by_viewer%2C%0A++++++full_name%2C%0A++++++profile_pic_url%2C%0A++++++username%0A++++%7D%0A++%7D%0A%7D%0A&ref=relationships%3A%3Afollow_list'

app.get('/userId', function(req, res) {
    // c.queue([{
    //     uri: 'https://smashballoon.com/instagram-feed/find-instagram-user-id/?username=' + req.query.name + '&318712zlr20044pjjl=4',
    //     jQuery: false,
    //     callback: function(error, result) {
    //         jsdom.env(
    //             result.body,
    //             ["./jquery.js"],
    //             function(err, window) {
    //                 var userId = [];
    //                 var id = window.$('html').find('#show_id').find('b').each(function(e, index) {
    //                     if (window.$(index).text().match('User ID:')) {
    //                         userId.push(window.$(index).text());
    //                     }
    //                 });
    //                 userId = userId[0].replace('User ID:', '');
    //                 userId = userId.replace(' ', '');
    //                 res.status(200).jsonp({id: userId, name: req.query.name});
    //             }
    //         );
    //     }
    // }]);


    instagram.getUserDataByUsername(req.params.userName).then(function(t) {
        res.status(200).jsonp({id: JSON.parse(t).user.id, name: req.params.userName});
        // instagram.getUserFollowers(JSON.parse(t).user.id).then(function(t) {
        //     console.log(t); // - instagram followers for user "username-for-get"
        // })
    })
});

app.post('/login', function(req, res) {
    instagram.getCsrfToken().then(function(csrf) {
        instagram.csrfToken = csrf;
    }).then(function() {
        instagram.auth(req.body.userName, req.body.password).then(function(sessionId) {
            instagram.sessionId = sessionId
            res.status(200)
        })
    })
});


app.post('/followers', function(req, res) {
    var followers = req.body,
        followersFiltered = [];
    followers.forEach(function(follower) {
        if (follower.node.followUserBio && follower.node.followUserBio.match(/([a-zA-Z0-9._-]+@[a-zA-Z0-9._-]+\.[a-zA-Z0-9._-]+)/gi)) {
            var emailBio = follower.node.followUserBio.match(/([a-zA-Z0-9._-]+@[a-zA-Z0-9._-]+\.[a-zA-Z0-9._-]+)/gi);
            followersFiltered.push({
                followUserFollow: follower.node.followUserFollow,
                followUserBio: emailBio[0],
                followerId: follower.node.id,
                followerAvatar: follower.node.profile_pic_url,
                followerUserName: follower.node.username,
                followerFullName: follower.node.full_name
            });
        }
    });
    console.log(followersFiltered);
    User.insertMany(followersFiltered);
    converter.json2csv(followersFiltered, function(err, csv) {
        if (err) res.status(500).jsonp(err);
        fs.writeFile(__dirname + '/public/' + req.query.name + '.csv', csv, function(data) {
            console.log(data);
            res.status(200).jsonp({followers: followersFiltered, csv: csv, url: 'http://185.69.153.184:6230/' + req.query.name + '.csv'});
            // res.status(200).jsonp({followers: followersFiltered, csv: csv, url: 'http://159.203.69.143:6230/' + req.query.name + '.csv'});
        });
    });
});


// TODO: MAIN URL!!!!!
// https://www.instagram.com/graphql/query/?query_id=17851374694183129&variables=%7B"id"%3A"559802352"%2C"first"%3A10%7D

app.post('/bio', function(req, res) {
    request('https://www.instagram.com/' + req.body.name + '/?__a=1', function (error, response, body) {
        if (!error && response.statusCode == 200) {
            body = JSON.parse(body);
            res.status(200).jsonp({bio: decodeURI(body.user.biography), follows: body.user.followed_by.count});
        }
    });
});

app.listen(6230);
console.log('Server listening on port 6230');
