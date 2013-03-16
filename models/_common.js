var createLinkSlug = function (str) {
  return str.replace(/!|'|"|,/g, "").replace(/\s/g, "-").toLowerCase();
}

var displayName = function (user) {
  if (user.profile && user.profile.name)
    return user.profile.name;
  
  var email = userEmail(user);
  if(!!email) {
    return email;
  } else {
    return "Anonymous!"
  }
};

var userEmail = function (user) {
  if(!user)
    return null;

  var profile = userSettings(user);
  if(!!profile && profile.email)
    return profile.email;
  return null;
};

var userPicture = function (user) {
  if(!user)
    return null;

  var profile = userSettings(user);
  if(!!profile && profile.picture)
    return profile.picture;
  return null;
};

var userSettings = function(user) {
  if(!user)
    return null;

  if(user.services) {
    return user.services.facebook || user.services.github || user.services.google || user.services.twitter;
  } else {
    return null;
  }
}