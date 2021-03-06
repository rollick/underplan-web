Meteor.methods({
  loginGoogle: function(googleUser, accessToken) {
    check(googleUser, Object);
    check(accessToken, String);
    
    var options, serviceData, userId;
    serviceData = {
      id: googleUser.id,
      accessToken: accessToken,
      email: googleUser.email
    };

    options = {
      profile: {
        name: googleUser.name
      }
    };
    
    var userId = Accounts.updateOrCreateUserFromExternalService('google', serviceData, options).id;
    if (userId) {
      this.setUserId(userId);
    }

    return {userId: userId};
  }
});

var setupAdmins = function () {
  var settings = Meteor.settings;

  Meteor.users.find({}).forEach( function (user) {
    if(!user.services)
      return;
    
    var isAdmin = false;
    if((user.services.twitter && _.contains(settings.admins, user.services.twitter.email)) ||
       (user.services.github && _.contains(settings.admins, user.services.github.email)) ||
       (user.services.google && _.contains(settings.admins, user.services.google.email)) ||
       (user.services.facebook && _.contains(settings.admins, user.services.facebook.email)) ||
       (user.services.password && _.contains(settings.admins, user.services.password.email))) {
      isAdmin = true;
      console.log("Adding admin: " + user._id);
    }
    Meteor.users.update({_id: user._id}, {$set: {admin: isAdmin}});
  });
};

var setupLoginServices = function () {
  var settings = Meteor.settings;
  var auth = settings.authentication;
  
  if(auth) {
    console.log("Found authentication settings for:");
    settings.public = settings.public || {};
    settings.public.authServices = settings.public.authServices || [];

    // Disable login services by default
    Accounts.loginServiceConfiguration.remove({
      service: "twitter"
    });
    Accounts.loginServiceConfiguration.remove({
      service: "github"
    });
    Accounts.loginServiceConfiguration.remove({
      service: "google"
    });
    Accounts.loginServiceConfiguration.remove({
      service: "facebook"
    });
    
    // Accounts config
    if(auth.twitter) {
      console.log("-- twitter");

      Accounts.loginServiceConfiguration.insert({
        service: "twitter",
        consumerKey: auth.twitter.clientId,
        secret: auth.twitter.secret
      });

      // settings.public.authServices.twitter = true;
    }

    if(auth.github) {
      console.log("-- github");

      Accounts.loginServiceConfiguration.insert({
        service: "github",
        clientId: auth.github.clientId,
        secret: auth.github.secret
      });

      // settings.public.authServices.github = true;
    }

    if(auth.google) {
      console.log("-- google");

      Accounts.loginServiceConfiguration.insert({
        service: "google",
        clientId: auth.google.clientId,
        secret: auth.google.secret
      });

      // settings.public.authServices.google = true;
    }

    if(auth.facebook) {
      console.log("-- facebook");

      Accounts.loginServiceConfiguration.insert({
        service: "facebook",
        appId: auth.facebook.appId,
        secret: auth.facebook.secret
      });

      // settings.public.authServices.facebook = true;
    }
  }
};

var createUserHook = function () {
  Accounts.onCreateUser(function(options, user){
    var accessToken, result, profile;
      
    if (user.services.github) {
      params = { access_token: user.services.github.accessToken };

      result = Meteor.http.get('https://api.github.com/user', { params: params });

    } else if (user.services.twitter) {
      console.log("Twitter has not been setup!!")

    } else if (user.services.google) {
      params = { access_token: user.services.google.accessToken, alt: "json" };

      result = Meteor.http.get('https://www.googleapis.com/oauth2/v1/userinfo', { params: params });

    } else if (user.services.facebook) {
      params = { access_token: user.services.facebook.accessToken, fields: "id,username,first_name,last_name,name,link,locale,gender,email,picture" };

      result = Meteor.http.get('https://graph.facebook.com/me', { params: params });

    } else { // local password user created
      return user;
    }
    
    if (result.error) {
      console.log(result.error)
      // throw error;
    }

    profile = _.pick(result.data,
      "login",
      "name",
      "avatar_url",
      "gender",
      "locale",
      "link",
      "first_name",
      "last_name",
      "picture",
      "url",
      "company",
      "blog",
      "location",
      "email",
      "bio",
      "html_url");

    if(user.services.facebook) {
      profile.picture = result.data.picture.data.url;
    } else if (user.services.github) {
      profile.picture = result.data.avatar_url;
      delete profile["avatar_url"];
    }

    user.profile = profile;
    
    return user;
  });
};

Meteor.startup(function() {
  setupAdmins();
  setupLoginServices();
  createUserHook();
});