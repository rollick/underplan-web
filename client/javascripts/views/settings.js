///////////////////////////////////////////////////////////////////////////////
// Main Settings

Template.mainSettings.isGroupAdmin = function () {
  return isGroupAdmin(Meteor.userId(), ReactiveGroupFilter.get("group"));
};

Template.mainSettings.rendered = function () {
  $(this.firstNode).foundation("accordion");
};

///////////////////////////////////////////////////////////////////////////////
// User Settings

Template.userSettings.events({
  'click .save': function (event, template) {
    event.stopPropagation();
    event.preventDefault();

    var nickname = template.find("#name").value;
    var email = template.find("#email").value;

    if (nickname.length) {
      Meteor.users.update(Meteor.userId(),{$set: {'profile.name': nickname, 'profile.email': email}});
      defaultBack();
    } else {
      Session.set("createError",
                  "You need a nickname.");
    }
  },
  'click .cancel': function () {
    event.stopPropagation();
    event.preventDefault();

    defaultBack();
  }
});

Template.userSettings.error = function () {
  return Session.get("createError");
};

Template.userSettings.user = function () {
  return Meteor.users.findOne(Meteor.userId())
};