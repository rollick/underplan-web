var migrations = function () {
  // Set Activity type to story if none exists
  Activities.update({type: {$exists: false}}, {$set: {type: "story"}});
  
  // Set Group defaults if none exist
  Groups.update({defaultView: {$exists: false}}, {$set: {defaultView: "Map"}});
  Groups.update({hidden: {$exists: false}}, {$set: {hiddne: false}});
};

Meteor.startup(function() {
  migrations();
});