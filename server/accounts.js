var setupAdmins = function () {
  var settings = Meteor.settings;

  Meteor.users.find({}).forEach( function (user) {
    if(!user.services)
      return;
    debugger
    var isAdmin = false;
    if((user.services.twitter && _.contains(settings.admins, user.services.twitter.email)) ||
       (user.services.github && _.contains(settings.admins, user.services.github.email)) ||
       (user.services.google && _.contains(settings.admins, user.services.google.email))) {
      isAdmin = true;
      console.log("Adding admin: " + user._id);
    }
    Meteor.users.update({_id: user._id}, {admin: isAdmin});
  });
};

var setupLoginServices = function () {
  var settings = Meteor.settings;
  var auth = settings.authentication;
  
  if(auth) {
    console.log("Found authentication settings for:");
    settings.public = settings.public || {};
    settings.public.authServices = settings.public.authServices || [];

    // Accounts.loginServiceConfiguration.remove({
    //  service: "facebook"
    // });

    // Accounts.loginServiceConfiguration.insert({
    //  service: "facebook",
    //  appId: process.env.FACEBOOK_APP_ID,
    //  secret: process.env.FACEBOOK_APP_SECRET
    // });

    // Accounts config
    if(auth.twitter) {
      console.log("-- twitter");
      Accounts.loginServiceConfiguration.remove({
        service: "twitter"
      });
      Accounts.loginServiceConfiguration.insert({
        service: "twitter",
        consumerKey: auth.twitter.clientId,
        secret: auth.twitter.secret
      });

      settings.public.authServices.push("twitter");
    }

    if(auth.github) {
      console.log("-- github");
      Accounts.loginServiceConfiguration.remove({
        service: "github"
      });
      Accounts.loginServiceConfiguration.insert({
        service: "github",
        clientId: auth.github.clientId,
        secret: auth.github.secret
      });

      settings.public.authServices.push("github");
    }

    if(auth.google) {
      console.log("-- google");
      Accounts.loginServiceConfiguration.remove({
        service: "google"
      });
      Accounts.loginServiceConfiguration.insert({
        service: "google",
        clientId: auth.google.clientId,
        secret: auth.google.secret
      });

      settings.public.authServices.push("google");
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
      params = { oauth_token: user.services.twitter.accessToken };

      result = Meteor.http.get('https://api.twitter.com/oauth/authenticate', { params: params });
    } else if (user.services.google) {
      params = { access_token: user.services.google.accessToken, alt: "json" };

      result = Meteor.http.get('https://accounts.google.com/o/oauth2/auth', { params: params });
    }
    
    if (result.error) {
      console.log(result.error)
      // throw error;
    }
    
    profile = _.pick(result.data,
      "login",
      "name",
      "avatar_url",
      "url",
      "company",
      "blog",
      "location",
      "email",
      "bio",
      "html_url");
    
    user.profile = profile;
    
    return user;
  });
};

Meteor.startup(function() {
  setupAdmins();
  setupLoginServices();
  // createUserHook();
});