
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
  update: function (userId, comments, fields, modifier) {
    return false; // no updates for now!
  },
  remove: function (userId, comments) {
    return ! _.any(comments, function (comment) {
      // deny if not the owner
      return comment.owner !== userId;
    });
  }
});

Meteor.methods({
  // options should include: activityId, comment
  createComment: function (options) {
    options = options || {};
    if (typeof options.comment === "string" && options.comment.length > 1024 )
      throw new Meteor.Error(413, "Comment too long");
    if (! options.activityId )
      throw new Meteor.Error(413, "No associated activity");
    if (! this.userId)
      throw new Meteor.Error(403, "You must be logged in");

    if ( typeof options.created === "undefined" )
      options.created = new Date()

    return Comments.insert({
      owner:      this.userId,
      comment:    options.comment,
      activityId: options.activityId,
      created:    options.created
    });
  },
});