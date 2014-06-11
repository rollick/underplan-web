///////////////////////////////////////////////////////////////////////////////
// Users

userPicture = function (user, width) {
  if(!user)
    return null;

  var profile = user.profile;
  var url = null;

  if(! _.isEmpty(user.services)) {
    if(user.services.google) {
      url = user.profile.picture;

      // Now replace the current size in the url path if required
      if(typeof width !== "undefined") {
        url = user.profile.picture;
        if(typeof width !== "undefined") {
          var sep = url.match(/\?/) ? "&" : "?";
          url = url + sep + "sz=" + width;
        }
      }

    } else if(user.services.facebook) {
      url = "https://graph.facebook.com/" + user.services.facebook.id + "/picture";
      if(typeof width !== "undefined") {
        url = url + "?width=" + width + "&height=" + width;
      }
    } else if(user.services.github) {
      url = user.profile.picture;
      if(typeof width !== "undefined") {
        var sep = url.match(/\?/) ? "&" : "?";
        url = url + sep + "s=" + width;
      }
    }

  } else if(!!profile && !!profile.picture) {
    if(!!profile && profile.picture) {
      var url = profile.picture;
    }    
  } else {
    url = Meteor.absoluteUrl() + "images/torso.png";
  }

  return url;
};

Meteor.methods({
  isAdmin: function () {
    if(!this.userId)
      return false;

    var settings = Meteor.settings;
    var user = Meteor.users.findOne(this.userId);
    if(!settings || !user)
      return false;

    if((user.services.twitter && _.contains(settings.admins, user.services.twitter.email)) ||
       (user.services.github && _.contains(settings.admins, user.services.github.email)) ||
       (user.services.google && _.contains(settings.admins, user.services.google.email))) {
      return true;
    } else {
      return false;
    }
  }
});