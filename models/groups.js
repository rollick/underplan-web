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

      // TODO: implement an isAdmin check here.
      // if (isAdmin(userId))
      //   return false; // not an admin

      var allowed = ["name", "description", "picasaUsername", "picasaAlbum"];
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
    if (typeof options.description === "string" && options.description.length > 100)
      throw new Meteor.Error(413, "Description too long");
    if (! this.userId)
      throw new Meteor.Error(403, "You must be logged in");

    if ( typeof options.created === "undefined" )
      options.created = new Date();

    if ( typeof options.slug === "undefined" || options.slug == "" )
      options.slug = createLinkSlug(options.name);

    return Groups.insert({
      owner:            this.userId,
      name:             options.name,
      description:      options.description,
      picasaUsername:   options.picasaUsername,
      picasaAlbum:      options.picasaAlbum,
      created:          options.created,
      slug:             options.slug,
      invited:          [],
      rsvps:            [],
      approved:         true // unapproved by default. Admins can approve
    });
  },

  invite: function (groupId, userId) {
    var group = Groups.findOne(groupId);
    if (! group || group.owner !== this.userId)
      throw new Meteor.Error(404, "No such group");

    if (userId !== group.owner && ! _.contains(group.invited, userId)) {
      Groups.update(groupId, { $addToSet: { invited: userId } });

      var from = userEmail(Meteor.users.findOne(this.userId));
      var to = userEmail(Meteor.users.findOne(userId));
      if (Meteor.isServer && to) {
        Email.send({
          from: "noreply@underplan.it",
          to: to,
          replyTo: from || undefined,
          subject: "Underplan: " + group.name,
          text:
"Hey, I just invited you to '" + group.name + "' on Underplan." +
"\n\nCome check it out: " + Meteor.absoluteUrl() + "/" + group.slug + "\n"
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