
///////////////////////////////////////////////////////////////////////////////
// Comments

/*
  Comments can be added against an activity.
*/

Comments = new Meteor.Collection("comments");

Comments.allow({
  insert: function (userId, comment) {
    return false; // no cowboy inserts -- use createComment method
  },
  update: function (userId, comment, fields, modifier) {
    return false; // no updates for now!
  },
  remove: function (userId, comment) {
    var groupId = Activities.findOne(comment.activityId).group;

    // deny if not the owner or a system admin or the group admin
    return (isGroupAdmin(userId, groupId) || isSystemAdmin(userId) || comment.owner === userId);
  }
});

Meteor.methods({
  // options should include: activityId, comment
  createComment: function (options) {
    if ( typeof options.created === "undefined" )
      options.created = new Date()

    if ( typeof options.groupId === "undefined" )
      options.groupId = Activities.findOne({_id: options.activityId}).group;

    check(options, {
      comment: String,
      activityId: String,
      groupId: String,
      created: Match.Any
    });

    // run check before saving. check will throw exceptions on invalid data
    App.Utils.checkCreateComment(this.userId, options);

    if(Meteor.isServer) {
      var comment = Comments.insert({
        owner:      this.userId,
        comment:    options.comment,
        activityId: options.activityId,
        groupId:    options.groupId,
        created:    options.created
      });

      // Notify group members about new comment
      App.Utils.notifyCommentCreated(this.userId, options);
    }

    // FIXME: Logging here even if the create fails. Would it be better to put it in
    //        the client view handler, or is there a callback for the Comments.insert above?
    App.Utils.trackCreateComment({"Activity ID": options.activityId});

    return comment;
  },
});

App.Utils.checkCreateComment = function (userId, options) {
  if (! userId)
    throw new Meteor.Error(403, "You must be logged in");
  if (typeof options.comment === "string" && options.comment.length > 1024 )
    throw new Meteor.Error(413, "Comment too long");
  if (! options.activityId )
    throw new Meteor.Error(413, "No associated activity");
};

if(Meteor.isClient) {
  App.Utils.trackCreateComment = function(properties) {
    App.trackEvent("Comment Created", properties);
  };

  // Stubbed for client. See isServer block for the actual code
  App.Utils.notifyCommentCreated = function () {
    return true;
  };
}