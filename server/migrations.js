var migrations = function () {
  Activities.update({type: {$exists: false}}, {$set: {type: "story"}});
};

Meteor.startup(function() {
  migrations();
});