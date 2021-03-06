///////////////////////////////////////////////////////////////////////////////
// Groups Home

Template.mainHome.events({
  'click .new-group': function (event, template) {
    event.stopPropagation();
    event.preventDefault();

    Router.setNewGroup();
  },
  'click .list .groups a, click .groups .panel': function (event, template) {
    event.stopPropagation();
    event.preventDefault();
    
    Router.setGroup(this);
  },
  'click .alert-box a.close': function (event, template) {
    event.stopPropagation();
    event.preventDefault();

    Session.set("message", null);
  }
});

Template.mainHome.helpers({
  groups: function () {
    return Groups.find({}, {sort: {created: -1}});
  },

  message: function () {
    return Session.get("message");
  }
});

///////////////////////////////////////////////////////////////////////////////
// Groups List Item

Template.groupItem.events({
  "click a.load-group": function (event, template) {
    if (this.defaultView == 'List') Router.setGroupFeed(group);
    else Router.setGroup(group);
  },
  "click .follow-group a": function (event, template) {
    event.stopPropagation();
    event.preventDefault();

    var followed = ! $(event.target).hasClass("followed");

    App.followGroup(this._id, followed);

    var text = $(event.target).siblings('.text');
    text.hide().toggleClass('follow', followed).animate({
      width: ['show', 'swing'],
      opacity: [1.0, 'linear']
    }, 200, function () {
      var self = this;
      setTimeout(
        function() 
        {
          $(self).animate({
            width: ['hide', 'swing'],
            opacity: [0, 'linear']
          }, 500);
        }, 2000);
    });
  }
});

Template.groupItem.helpers({
  hideGroup: function () {
    var userId = Meteor.userId(),
        groupId = this._id;

    if (userBelongsToGroup(userId, groupId) || 
        App.isFollowingGroup(userId, groupId) ||
        isSystemAdmin(userId)) {
      return false;
    }

    return this.hidden;
  },
  groupPath: function () {
    var path = "/" + this.slug;
    if (this.defaultView == 'List') path += "/feed";
    return path
  },
  userCanFollow: function () {
    // can follow if logged in but not a group member
    return !!Meteor.user() && !App.belongsToGroup()
  },
  followingGroup: function () {
    return App.isFollowingGroup(Meteor.userId(), this._id);
  },
  group: function() {
    return this;
  },
  followedCls: function () {
    return (App.isFollowingGroup(Meteor.userId(), this._id) ? "followed" : "");
  }
});
