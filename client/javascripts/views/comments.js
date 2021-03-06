///////////////////////////////////////////////////////////////////////////////
// Activity comment

var saveComment = function (template, success) {
  Session.set("displayError", null);
  var submit = $(template.find(".save.button"));
  if(submit.hasClass("disabled")) {
    return false;
  } else {
    submit.addClass("disabled");
  }

  var comment = template.find("form #comment");
  var commentText = comment.value;
  var activityId = template.find("form #activity-id").value;
  
  // Clear input here and then re-set if save fails
  comment.value = "";

  if (activityId && Meteor.userId() && commentText.length) {
    Meteor.call('createComment', {comment: commentText, activityId: activityId}, function (error, commentId) {
      if (error) {
        Session.set("displayError", [error.error, error.reason].join(": "));
        comment.value = commentText;
      } else {
        if (_.isFunction(success)) { success.call(commentId); }
        comment.focus();
      }
    });
  } else {
    Session.set("displayError",
                "It needs a comment");
  }

  return false;
};

Template.commentForm.helpers({
  activity: function () {
    return Activities.findOne(ReactiveGroupFilter.get("activity"));
  },

  error: function () {
    return Session.get("displayError");
  }
});

Template.commentForm.rendered = function () {
};

Template.commentForm.events({
  'focus #comment': function (event, template) {
    $(template.find(".comment-form")).addClass("expanded");

    return false;
  },
  'click .cancel': function (event, template) {
    event.stopPropagation();
    event.preventDefault();

    $(template.find(".comment-form")).removeClass("expanded");
  },
  'click .save': function (event, template) {
    event.stopPropagation();
    event.preventDefault();

    saveComment(template);
  },
  'keyup #comment': function (event, template) {
    var comment = template.find("#comment").value,
        submit =  template.find(".save.button");

    if(comment.length > 0) {
      $(submit).removeClass("disabled");
    } else {
      $(submit).addClass("disabled");
    }
  },
});

///////////////////////////////////////////////////////////////////////////////
// Comments list

Template.commentList.helpers({
  anyComments: function () {
    return Comments.find({activityId: this._id}).count() > 0;
  },

  comments: function () {
    return Comments.find({activityId: this._id}, {sort: {created: 1}});
  }
});

///////////////////////////////////////////////////////////////////////////////
// Comment

Template.comment.helpers({
  canRemove: function () {
    var userId = Meteor.userId();
    var groupId = Activities.findOne(this.activityId).group;

    return (isGroupAdmin(userId, groupId) || isSystemAdmin(userId) || this.owner === userId);
  },

  // The subscription for comments initially doesn't return the owner
  // so we can use that below to check whether the full data has loaded
  // FIXME: this is a bad way to check for a full record
  loaded: function() {
    var comment = Comments.findOne(this._id);
    return (!!comment && !!comment.owner);
  }
});

Template.comment.events({
  'click .remove': function (event, template) {
    event.stopPropagation();
    event.preventDefault();
    
    var button = $(event.target);
    if (button.hasClass("ready")) {
      $(template.find(".comment")).addClass("disabled");
      Comments.remove(this._id);
    } else {
      button.addClass("ready");

      // after 2 secs reset the button state
      setTimeout( function () {
        button.removeClass("ready");
      }, 2000);
    }
  }
});
