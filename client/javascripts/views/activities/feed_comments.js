///////////////////////////////////////////////////////////////////////////////
// Feed Item Comments

var scrollTimeout = null;

Template.itemComments.rendered = function () {
  setFeedCommentsNotice(this);
};

Template.itemComments.destroyed = function () {
  scrollTimeout = null;
};

Template.itemComments.events({
  "scroll .short-comments .inner": function (event, template) {
    if (scrollTimeout) {
      clearTimeout(scrollTimeout);
    }
    
    scrollTimeout = setTimeout( function () {
      setFeedCommentsNotice(template);
    }, 150);
  },
  "click .comments-notice > .inner": function (event, template) {
    var list = template.find(".short-comments .inner");

    list.scrollTop = list.scrollHeight;
  }
});

hideFeedCommentsNotice = function (item) {
  item.find(".comments-notice .inner").hide();
};

setFeedCommentsNotice = function (template) {
  var commentsView    = $(template.find(".short-comments > .inner")),
      commentsNotice  = $(template.find(".comments-notice > .inner")),
      viewportHeight  = commentsView.outerHeight(),
      hiddenComments  = [];
  
  commentsView.find(".comment").each( function(index, comment) {
    if ($(comment).position().top > viewportHeight - 60) {
      hiddenComments.push(comment);
    }
  });

  if(hiddenComments.length > 0) {
    var commentText = hiddenComments.length > 1 ? "comments" : "comment";
    commentsNotice.text(hiddenComments.length + " " + commentText);

    // FIXME: We shouldn't assume the parent is a .feed-item or .single-item. Maybe 
    //        the parent should be set when this class is created and it should be 
    //        set on here as a property, eg delegate.
    if ($(template.firstNode).closest(".feed-item, .single-item").hasClass("expanded"))
      commentsNotice.show();
  } else {
    commentsNotice.text("").hide();
  }
}