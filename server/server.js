// Underplan -- server

Meteor.publish("directory", function () {
  return Meteor.users.find({});
  //return Meteor.users.find({}, {fields: {"emails": 1, "profile": 1, "admin": 1}});
});

Meteor.publish("activities", function () {
  // TODO:  need to also publish activities if the activity is unpublished
  //        but is linked to a group to which the current user belongs.
  groups = Groups.find({invited: this.userId}, {fields: {_id: 1}}).map(function(group) {
    return group._id;
  });

  return Activities.find(
    {$or: [{"published": true}, {"owner": this.userId}, {"group": {$in: groups}}]});
});

Meteor.publish("allGroups", function () {
  var conditions;
  var settings = Meteor.settings;
  var user = Meteor.users.findOne(this.userId);

  // console.log(settings);
  if(!!settings && user) {
    // console.log(user.services);
    if((user.services.twitter && _.contains(settings.admins, user.services.twitter.email)) ||
       (user.services.github && _.contains(settings.admins, user.services.github.email)) ||
       (user.services.google && _.contains(settings.admins, user.services.google.email))) {
      conditions = {};
    } else {
      conditions = {$or: [{"approved": {$exists: false}, "approved": true}]};
    }
  }

  return Groups.find(conditions);
});

Meteor.publish("allComments", function () {
  return Comments.find();
});