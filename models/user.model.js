var mongoose = require('mongoose');
var Schema = mongoose.Schema;

var Userchema = new Schema({
    followerId:String,
    followerAvatar: String,
    followerUserName: String,
    followerFullName: String,
    followUserFollow: Number,
    followUserBio: String,
    created: {
        type: Date,
        default: Date.now
    }
});

Userchema.pre('save', function(next) {
    next();
});

mongoose.model('User', Userchema);