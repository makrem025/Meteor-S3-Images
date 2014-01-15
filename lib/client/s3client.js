"use strict";

Handlebars.registerHelper("S3", function (options) {
    var uploadOptions = options.hash;
    var template = options.fn;
    var callback = uploadOptions.callback;
    var context = this;

    if (!template) {
        return;
    }

    var html;
    html = Spark.isolate(function(){
        return template();
    });

    html = Spark.attachEvents({
        "change input[type=file]": function (e) {
            var file = e.currentTarget.files[0];

            if (!file.type.match("image/*")) {
                throw new Meteor.Error(415, "Content is not an image");
            } else {
                Session.set("uploading", true);

                var img = new Image();
                img.src = URL.createObjectURL(file);
                img.onload = function() {
                    var canvas = document.createElement("canvas");
                    var ctx = canvas.getContext("2d");
                    ctx.drawImage(img, 0, 0);

                    var fileData = {
                        name:file.name,
                        size:file.size,
                        type:file.type
                    };

                    var MAX_WIDTH = uploadOptions.width;
                    var MAX_HEIGHT = uploadOptions.height;
                    var width = img.width;
                    var height = img.height;

                    if (width > height) {
                        if (width > MAX_WIDTH) {
                            height *= MAX_WIDTH / width;
                            width = MAX_WIDTH;
                        }
                    } else {
                        if (height > MAX_HEIGHT) {
                            width *= MAX_HEIGHT / height;
                            height = MAX_HEIGHT;
                        }
                    }

                    canvas.width = width;
                    canvas.height = height;

                    ctx.drawImage(img, 0, 0, width, height);

                    var dataUrl = canvas.toDataURL(fileData.type);
                    var binaryImg = atob(
                            dataUrl.slice(
                                dataUrl.indexOf("base64")+7,
                                dataUrl.length
                            )
                        );
                    var length = binaryImg.length;
                    var ab = new ArrayBuffer(length);
                    var ua = new Uint8Array(ab);
                    for (var i = 0; i < length; i++){
                        ua[i] = binaryImg.charCodeAt(i);
                    }
                    fileData.data = ua;

                    Meteor.call("S3upload",
                        fileData,
                        context,
                        callback,
                        function(error, url){
                            Session.set("S3url", url);
                            Session.set("uploading", false);
                        });
                };
            }
        }
    },html);

    return html;
});
