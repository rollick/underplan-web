var createLinkSlug = function (str) {
  return str.replace(/!|'|"|,/g, "").replace(/\s/g, "-").toLowerCase();
}

var displayName = function (user) {
  if (user.profile && user.profile.name)
    return user.profile.name;
  
  var email = contactEmail(user);
  if(!!email) {
    return email;
  } else {
    return "Anonymous!"
  }
};

var contactEmail = function (user) {
  if (user.emails && user.emails.length)
    return user.emails[0].address;
  if (user.services && user.services.facebook && user.services.facebook.email)
    return user.services.facebook.email;
  if (user.services && user.services.github && user.services.github.email)
    return user.services.github.email;
  if (user.services && user.services.google && user.services.google.email)
    return user.services.google.email;
  if (user.services && user.services.twitter && user.services.twitter.email)
    return user.services.twitter.email;
  return null;
};