// Underplan -- server

Meteor.publish("directory", function () {
  return Meteor.users.find({}, {fields: {emails: 1, profile: 1}});
});

Meteor.publish("activities", function () {
  return Activities.find(
    {$or: [{"published": true}, {owner: this.userId}]});
});

Meteor.publish("groups", function () {
  return Groups.find();
});