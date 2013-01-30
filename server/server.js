// Underplan -- server


Meteor.publish("activities", function () {
  return Activities.find(
    {$or: [{"published": true}, {owner: this.userId}]});
});

Meteor.publish("groups", function () {
  return Groups.find();
});