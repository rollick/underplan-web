Template.page.showUserSettings = function () {
  return Session.get("showUserSettings");
};

Template.userSettings.events({
  'click .save': function (event, template) {
    var nickname = template.find(".name").value;

    if (nickname.length) {
      Meteor.users.update(Meteor.userId(),{$set: {'profile.name':nickname}});
      defaultBack();
    } else {
      Session.set("createError",
                  "You need a nickname.");
    }
  },
  'click .cancel': function () {
    defaultBack();
    return false;
  }
});

Template.userSettings.error = function () {
  return Session.get("createError");
};

Template.userSettings.user = function () {
  return Meteor.users.findOne(Meteor.userId())
};