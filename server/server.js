// Underplan -- server

Meteor.publish("directory", function () {
  return Meteor.users.find({}, {fields: {emails: 1, profile: 1}});
});

Meteor.publish("activities", function () {
  // TODO:  need to also publish activities if the activity is unpublished
  //        but is linked to a group to which the current user belongs.
  return Activities.find(
    {$or: [{"published": true}, {owner: this.userId}]});
});

Meteor.publish("allGroups", function () {
  return Groups.find();
});

Meteor.publish("allComments", function () {
  return Comments.find();
});