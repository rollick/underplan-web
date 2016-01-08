///////////////////////////////////////////////////////////////////////////////
// Main Settings

Template.mainSettings.helpers({
  isGroupAdmin: function () {
    return isGroupAdmin(Meteor.userId(), ReactiveGroupFilter.get("group"));
  }
});

///////////////////////////////////////////////////////////////////////////////
// Group Settings

Template.groupSettings.rendered = function () {
  // $(this.find(".accordion")).foundation("accordion");
};

Template.groupSettings.events({
  'click dd a': function (element, template) {
    var target = $(element.target);

    target.closest(".accordion").find("dd > .content").removeClass("active");
    target.parent().find(".content").addClass("active");

    $('html,body').animate({
        scrollTop: target.offset().top},
        'slow');
  }
});

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
      Session.set("displayError",
                  "You need a nickname.");
    }
  },
  'click .cancel': function () {
    event.stopPropagation();
    event.preventDefault();

    defaultBack();
  }
});

Template.userSettings.helpers({
  error: function () {
    return Session.get("displayError");
  },

  user: function () {
    return Meteor.users.findOne(Meteor.userId())
  }
});