'use strict'
let AWS = require('aws-sdk');
let S3Image = require('./lib/S3Image');
let gm = require('gm').subClass({imageMagick: true});
let s3 = new AWS.S3({
    apiVersion: "2006-03-01",
    endpoint: "https://s3-ap-northeast-1.amazonaws.com"
});

function getS3Image(bucket, key) {
    return new Promise(function (resolve, reject) {
        s3.getObject({Bucket: bucket, Key: key}, function (error, data) {
            if (error) {
                reject(error);
            } else {
                resolve(new S3Image(bucket, key, data.Body, data.ContentType));
            }
        });
    });
}

function transform(image) {
    return new Promise(function (resolve, reject) {
        let imgType = image.getContentType().split('/')[1];
        gm(image.getData()).resize(300).toBuffer(imgType, function (error, buffer) {
            if (error) {
                reject(error);
            } else {
                image.setData(buffer);
                resolve(image)
            }
        });
    });
}

function putS3Image(image) {
    return new Promise(function (resolve, reject) {
        s3.putObject({
            Bucket: image.getBucket(),
            ACL: "public-read",
            Key: image.getKey().replace("images/uploads", "images/200w"),
            Body: image.getData(),
            ContentType: image.getContentType()
        }, function (err) {
            if (err) {
                reject(err);
            } else {
                resolve("success put image");
            }
        });
    });
}

exports.handler = function (event, context) {
    let s3Record = event.Records[0].s3;
    let srcBucket = s3Record.bucket.name;
    let srcKey = decodeURIComponent(s3Record.object.key.replace(/\+/g, " "));

    getS3Image(srcBucket, srcKey).then(function (image) {
        return transform(image);
    }).then(function (image){
        return putS3Image(image);
    }).then(function (message) {
        console.log(message);
    }).catch(function (error) {
        console.error(error);
    });
};
