// Underplan -- data model
// Loaded on both the client and the server

///////////////////////////////////////////////////////////////////////////////
// Groups

/*
  Groups are a top level container for models like Activities. Eventually they will include
  membership and access control (for posting, editing etc) based on this membership.
*/

Groups = new Meteor.Collection("groups");

Groups.allow({
  insert: function (userId, group) {
    return false; // no cowboy inserts -- use createGroup method
  },
  update: function (userId, groups, fields, modifier) {
    return _.all(groups, function (group) {
      if (userId !== group.owner)
        return false; // not the owner

      var allowed = ["name"];
      if (_.difference(fields, allowed).length)
        return false; // tried to write to forbidden field

      // A good improvement would be to validate the type of the new
      // value of the field (and if a string, the length.) In the
      // future Meteor will have a schema system to makes that easier.
      return true;
    });
  },
  remove: function (userId, groups) {
    return ! _.any(groups, function (group) {
      // deny if not the owner
      return group.owner !== userId;
    });
  }
});

Meteor.methods({
  // options should include: name
  createGroup: function (options) {
    options = options || {};
    if (typeof options.name === "string" && options.name.length > 100)
      throw new Meteor.Error(413, "Name too long");
    if (! this.userId)
      throw new Meteor.Error(403, "You must be logged in");

    if ( typeof options.created === "undefined" )
      options.created = new Date()

    if ( typeof options.slug === "undefined" || options.slug == "" )
      options.slug = createLinkSlug(options.name);

    return Groups.insert({
      owner:      this.userId,
      name:       options.name,
      created:    options.created,
      slug:       options.slug,
      invited:    [],
      rsvps:      []
    });
  },

  invite: function (groupId, userId) {
    var group = Groups.findOne(groupId);
    if (! group || group.owner !== this.userId)
      throw new Meteor.Error(404, "No such group");

    if (userId !== group.owner && ! _.contains(group.invited, userId)) {
      Groups.update(groupId, { $addToSet: { invited: userId } });

      var from = contactEmail(Meteor.users.findOne(this.userId));
      var to = contactEmail(Meteor.users.findOne(userId));
      if (Meteor.isServer && to) {
        // This code only runs on the server. If you didn't want clients
        // to be able to see it, you could move it to a separate file.
        Email.send({
          from: "noreply@example.com",
          to: to,
          replyTo: from || undefined,
          subject: "Underplan: " + group.name,
          text:
"Hey, I just invited you to '" + group.name + "' on Underplan." +
"\n\nCome check it out: " + Meteor.absoluteUrl() + "\n"
        });
      }
    }
  },

  rsvp: function (groupId, rsvp) {
    if (! this.userId)
      throw new Meteor.Error(403, "You must be logged in");
    if (! _.contains(['yes', 'no'], rsvp))
      throw new Meteor.Error(400, "Invalid RSVP");
    var group = Groups.findOne(groupId);
    if (! group)
      throw new Meteor.Error(404, "No such group");
    if (group.owner !== this.userId && !_.contains(group.invited, this.userId))
      throw new Meteor.Error(403, "No must be invited");

    var rsvpIndex = _.indexOf(_.pluck(group.rsvps, 'user'), this.userId);
    if (rsvpIndex !== -1) {
      // update existing rsvp entry

      if (Meteor.isServer) {
        // update the appropriate rsvp entry with $
        Groups.update(
          {_id: groupId, "rsvps.user": this.userId},
          {$set: {"rsvps.$.rsvp": rsvp}});
      } else {
        // minimongo doesn't yet support $ in modifier. as a temporary
        // workaround, make a modifier that uses an index. this is
        // safe on the client since there's only one thread.
        var modifier = {$set: {}};
        modifier.$set["rsvps." + rsvpIndex + ".rsvp"] = rsvp;
        Groups.update(groupId, modifier);
      }
    } else {
      // add new rsvp entry
      Groups.update(groupId,
                     {$push: {rsvps: {user: this.userId, rsvp: rsvp}}});
    }
  }
});

///////////////////////////////////////////////////////////////////////////////
// Activities

/*
  This is an abstract model to represent travel activities, eg geo location, story post,
  photos added. At its most basic the event can have a title, text or 
  geo location. For example, a new destination would just have a geo location 
  (and possibly a title), a story would have text (and possibly a geo location), a photo
  would be a url to a publically accessible image.
*/

Activities = new Meteor.Collection("activities")

Activities.allow({
  insert: function (userId, activity) {
    return false; // no cowboy inserts -- use createActivity method
  },
  update: function (userId, activities, fields, modifier) {
      debugger
    return _.all(activities, function (activity) {
      if (userId !== activity.owner)
        return false; // not the owner
      var allowed = ["groupId", "slug", "published", "location", "title", "text", "lat", "lng", "url", "urlType", "created"];
      if (_.difference(fields, allowed).length)
        return false; // tried to write to forbidden field

      // A good improvement would be to validate the type of the new
      // value of the field (and if a string, the length.) In the
      // future Meteor will have a schema system to makes that easier.
      return true;
    });
  },
  remove: function (userId, activities) {
    return ! _.any(activities, function (activity) {
      // deny if not the owner
      return activity.owner !== userId;
    });
  }
});

Meteor.methods({
  // options should include: title, description, x, y, public
  createActivity: function (options) {
    options = options || {};
    if (typeof options.title === "string" && options.title.length > 100)
      throw new Meteor.Error(413, "Title too long");
    if (typeof options.text === "string" && options.text.length > 1000)
      throw new Meteor.Error(413, "Text too long");
    if (! this.userId)
      throw new Meteor.Error(403, "You must be logged in");

    if (! options.groupId)
      throw new Meteor.Error(403, "Activity must below to a group");
    
    var group =  Groups.findOne(options.groupId);
    if (! userBelongsToGroup(this.userId, group._id))
      throw new Meteor.Error(403, "You must be a member of " + group.name);

    if ( typeof options.created === "undefined" )
      options.created = new Date()

    if ( typeof options.slug === "undefined" || options.slug == "" )
      options.slug = createLinkSlug(options.title);

    return Activities.insert({
      owner:      this.userId,
      group:      options.groupId,
      lat:        options.lat,
      lng:        options.lng,
      title:      options.title,
      text:       options.text,
      url:        options.url,
      urlType:    options.urlType,
      tags:       [],
      created:    options.created,
      location:   options.location,
      slug:       options.slug,
      published:  !! options.published
    });
  },
});

var createLinkSlug = function (str) {
  return str.replace(/!|'|"|,/g, "").replace(/\s/g, "-").toLowerCase();
}

var activityType = function (activity) {
    if (typeof activity.urlType === "string" && activity.urlType.length) {
      return activity.urlType;
    } else if ( typeof activity.title === "string" && activity.title.length && typeof activity.text === "string" && activity.text.length ) {
      return "story";
    } else if ( typeof activity.lat === "float" && typeof activity.lng === "float" && typeof activity.description === "undefined" ) {
      return "location";
    } else {
      return "undefined";
    }
  }

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

///////////////////////////////////////////////////////////////////////////////
// Users

var displayName = function (user) {
  if (user.profile && user.profile.name)
    return user.profile.name;
  return user.emails[0].address;
};

var contactEmail = function (user) {
  if (user.emails && user.emails.length)
    return user.emails[0].address;
  if (user.services && user.services.facebook && user.services.facebook.email)
    return user.services.facebook.email;
  return null;
};
