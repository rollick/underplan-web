///////////////////////////////////////////////////////////////////////////////
// Users

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