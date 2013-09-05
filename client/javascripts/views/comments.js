///////////////////////////////////////////////////////////////////////////////
// Activity comment

var saveComment = function (template, success) {
  Session.set("createError", null);
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
        Session.set("createError", [error.error, error.reason].join(": "));
        comment.value = commentText;
      } else {
        if (_.isFunction(success)) { success.call(commentId); }
        comment.focus();
      }
    });
  } else {
    Session.set("createError",
                "It needs a comment");
  }

  return false;
};

Template.commentForm.activity = function () {
  return Activities.findOne(getCurrentActivityId());
};

Template.commentForm.events({
  'focus #comment': function (event, template) {
    $(template.find(".comment-form")).addClass("expanded");

    return false;
  },
  'click .cancel': function (event, template) {
    $(template.find(".comment-form")).removeClass("expanded");

    return false;
  },
  'click .save': function (event, template) {
    return saveComment(template);
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

Template.commentForm.error = function () {
  return Session.get("createError");
};

Template.commentForm.rendered = function () {
};

///////////////////////////////////////////////////////////////////////////////
// Comments list

Template.commentList.anyComments = function () {
  return Comments.find({activityId: this._id}).count() > 0;
};

Template.commentList.comments = function () {
  return Comments.find({activityId: this._id}, {sort: {created: 1}});
};

///////////////////////////////////////////////////////////////////////////////
// Comment

Template.comment.canRemove = function () {
  var userId = Meteor.userId();
  var groupId = Activities.findOne(this.activityId).group;

  return (isGroupAdmin(userId, groupId) || isSystemAdmin(userId) || this.owner === userId);
};

// The subscription for comments initially doesn't return the owner
// so we can use that below to check whether the full data has loaded
Template.comment.loaded = function() {
  return !!Comments.findOne(this._id).owner;
};

Template.comment.events({
  'click .remove': function (event, template) {
    $(template.find(".comment")).addClass("disabled");
    Comments.remove(this._id);

    return false;
  },
  'mouseenter .comment': function (event, template) {
    $(template.find(".actions")).show();
  },
  'mouseleave .comment': function (event, template) {
    $(template.find(".actions")).hide();
  } 

});
