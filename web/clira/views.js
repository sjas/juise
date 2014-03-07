/*
 * $Id$
 *  -*-  indent-tabs-mode:nil -*-
 * Copyright 2013, Juniper Network Inc.
 * All rights reserved.
 * This SOFTWARE is licensed under the LICENSE provided in the
 * Copyright file. By downloading, installing, copying, or otherwise
 * using the SOFTWARE, you agree to be bound by the terms of that
 * LICENSE.
 */


/*
 * Ember views for the jQuery UI widgets.
 */

// Ember view for the jQuery UI Autocomplete widget
JQ.AutoCompleteView = Ember.TextField.extend(JQ.Widget, {
    uiType: 'autocomplete',
    uiOptions: ['disabled', 'autoFocus', 'delay', 'minLength', 'position',
                'source'],
    uiEvents: ['close']
});

// Ember view for the JQuery UI Button widget
JQ.ButtonView = Em.View.extend(JQ.Widget, {
    uiType: 'button',
    uiOptions: ['label', 'disabled', 'icons', 'text'],
    tagName: 'button'
});

// Emebr view for jQuery UI Dialog widget
JQ.Dialog = Em.View.extend(JQ.Widget, {
    uiType: 'dialog',
    uiOptions: ['autoOpen', 'buttons', 'height', 'modal', 'resizable',
                'title', 'width'],
    uiEvents: ['open', 'close']
});


/*
 * Views to handle dynamic forms. To create dynamic forms, we must extend this
 * class and create a childView from the extended class by passing JSON object
 * containing fields object. Fields object contains hash of fields which hold
 * title, name, value, boolean values corresponding to each field. If boolean
 * is set to true, we will render a checkbox instead of textfield. User can
 * also specify an optional boolean flag 'secret' which will make the text
 * inputbox be used to accept secret data. In the overridden class, user 
 * should specify hash of buttons along with their click functions. view and 
 * viewContext global variables will be available in the button action 
 * functions. When the user modifies any value, it will be captured in 
 * fieldValues as name:value and the same can be retrieved from 
 * viewContext.get('fieldValues')
 */
Clira.DynFormView = Ember.ContainerView.extend({
    view: null,
    viewContext: null,
    width: "auto",
    classNames: ['output-content'],

    // Set view and view context as globals
    didInsertElement: function() {
        this._super.apply(this, arguments);
        view = this;
        viewContext = view.get('context');

        /*
         * Iterate through buttons and create ButtonViews for the same
         */
        var buttons = this.get('buttons');
        if (buttons) {
            for (var key in buttons) {
                var buttonView = JQ.ButtonView.extend({
                    label: key,
                    click: buttons[key]
                });
                this.pushObject(buttonView.create());
            }
        }
    },

    // Insert view containing form fields
    init: function() {
        var fieldsView = Ember.View.create({
            templateName: 'dyn_form'
        });
        this.set('childViews', [fieldsView]);
        this._super();
    },

    /*
     * Set fields and fieldValues as properties on controller so we can use
     * them in template and to capture the modified values
     */
    willInsertElement: function() {
        this.get('controller').set('message', this.get('message'));
        this.get('controller').set('fields', this.get('fields'));
        this.get('controller').set('fieldValues', {});
    }
});

/*
 * View to handle text inputbox in dynamic forms
 */
Clira.DynTextField = Ember.TextField.extend({
    // We observe on value changes and update fieldValues
    valueChange: function() {
        var fieldId = this.get('fieldId');
        var values = this.get('values');
        if (values && fieldId) {
            values[fieldId] = this.get('value');
        }
    }.observes('value')
});

/*
 * View to handle input checkbox in dynamic forms
 */
Clira.DynCheckbox = Ember.Checkbox.extend({
    // We observe on value changes and update fieldValues
    valueChange: function() {
        var fieldId = this.get('fieldId');
        var values = this.get('values');
        if (values && fieldId) {
            values[fieldId] = this.get('checked');
        }
    }.observes('checked')
});

/*
 * Pseudo view that can be used to append views created for DOM elements
 * without parent views
 */
Clira.PseudoView = Ember.View.extend({
    elementId: "pseudo_view"
});


/*
 * Extendable Clira specific Ember views.
 */

/*
 * Ember view for jQuery UI autocomplete widget. Our 'source' for autocomplete
 * comes from the view's controller which reads the value in input field and
 * spits out possible completions. In this view, we take care of decorating
 * the autocomplete items by overriding _renderItem() of autocomplete widget
 * after the view is inserted to the DOM.
 */
Clira.AutoComplete = JQ.AutoCompleteView.extend({
    attributeBindings: ['autocomplete', 'autofocus', 'maxlength', 
                        'spellcheck'],
    autocomplete: 'off',
    autofocus: 'on',
    classNames: ['command-value', 'input', 'text-entry'],
    maxlength: '2048',
    spellcheck: 'false',

    // Called after the view is added to the DOM
    didInsertElement: function() {
        this._super.apply(this, arguments);

        // Set the source as controller's autoComplete function
        this.ui.source = this.get('targetObject').autoComplete;

        // Save controller to be used later
        this.ui.controller = this.get('targetObject');

        // Handle focus events
        this.$().focus(function(event, ui) {
            $('#command-input-box').attr('class', 'input-box focus-on');        
        });

        var that = this;
        
        // When user hits enter, prevent default and execute command
        this.$().keypress(function(e) {
            var code = (e.keyCode ? e.keyCode : e.which);
            if(code == 13) { //Enter keycode
               e.preventDefault();
               that.insertNewline(); 
            }
        });

        // Decorate autocomplete list
        this.ui._renderItem = function renderItemOverride(ul, item) {
            var append = "<a class='>";

            if (item.image) {
                append += "<img src='" + item.image + "' class='rendered";
                if (item.image_class)
                    append += " " + item.image_class;
                append += "'></img>";
            } else if (item.image_class)
                append += "<div class='" + item.image_class + "'></div>";

            append += "<div>" + item.html;
            if (item.help)
                append += "</div><div class='command-help'>" + item.help;
            append += "</div></a>";

            return $("<li></li>")
                .data("item.autocomplete", item)
                .append(append)
                .appendTo(ul);
        };
    },

    // Fade out the input box border on focus out
    focusOut: function() {
        $('#command-input-box').attr('class', 'input-box focus-off');
    },

    // Execute the command when the user hits return
    insertNewline: function() {
        this.ui.close();
        this.get('targetObject').executeCommand();
    },

    // Scroll up and focus the input field when on command change
    scrollUp: function() {
        $("html, body").animate({ scrollTop: 0 }, 300);
        this.$().focus();
    }.observes('targetObject.command')
});


/*
 * Extending Ember's ContainerView, this view deals with the output from each
 * command run. This view houses two child views, one for the header and the
 * other to wrap output from command run. Header is inserted into the
 * container during the view initialization and uses 'output_header' template. 
 * For the child view that displays command output, we read template name from
 * view's controller (if defined in command definition) and use the template
 * to render the output.
 */
Clira.OutputContainerView = Ember.ContainerView.extend({
    templateName: "output_container",
    classNames: ['output-wrapper', 'ui-widget', 'ui-widget-content', 
                 'ui-corner-all'],

    // Insert output header child
    init: function() {
        var outputHeader = Ember.View.create({
            templateName: 'output_header'
        });
        this.set('childViews', [outputHeader]);
        this._super();
    },

    /*
     * Once the view is added to the DOM, we have access to our controller.
     * Get template name to render the output with from the controller. Use
     * 'output_content_layout' to wrap the rendered output in the output
     * container.
     */
    didInsertElement: function() {
        // Emit messages if there are any
        if (this.get('controller').messages) {
            var messagesView = Ember.View.create({
                context: this.get('controller').messages,
                layoutName: "output_content_layout",
                templateName: "clira_messages"
            });
            this.pushObject(messagesView);
        }

        var poss = this.get('controller').poss,
            parse = this.get('controller').parse,
            command = this.get('controller').command;

        // Proceed with output generation only for valid commands
        if (!this.get('controller').parseErrors) {
            var contentView = Ember.View.create({
                layoutName: "output_content_layout",
                underlay: true,
                templateName: this.get('controller').contentTemplate,

                didInsertElement: function() {
                    // Call execute function once we are in DOM
                    poss.command.execute.call(null, contentView, command, 
                                                parse, poss);
                    // Set view in controller so we can pass it to onUpdate
                    // functions
                    contentView.get('controller').set('view', this);
                }
            });
            this.pushObject(contentView);
        }
    },

    /*
     * When views are stacked in a output container, we hide the views which
     * has underlay set to true
     */
    toggleChildVisibility: function() {
        var childViews = this.get('_childViews');
        for (var i = childViews.length - 2; i >= 0; i--) {
            if (childViews[i].underlay) {
                childViews[i].set('isVisible', false);
            }
        }

        childViews[childViews.length - 1].set('isVisible', true);
    }.observes('childViews')
});


/*
 * Extend ButtonView to define a pulldown icon/button
 */
Clira.PulldownIcon = JQ.ButtonView.extend({
    label: null,
    text: false,
    icons: {
        primary: 'ui-icon-triangle-1-s'
    },

    click: function() {
        this.get('controller').toggleMruPulldown();
    }
});


/*
 * Extend ButtonView to define generic Icon view that can be used to display
 * icons, catch click events and delegate them to action functions defined in
 * parent controller and change icons after click. Usage is as below
 *   {{view Clira.IconView iconClass="class1,class2" onClick="function"}}
 * iconClass is comma separated list of icon classes that will be cycled
 * through after each click. onClick is the action function defined in
 * 'actions' hash in the parent controller that receives controller as
 * argument from IconView's click event
 */
Clira.IconView = JQ.ButtonView.extend({
    label: null,
    text: false,

    // Read and save list of iconClasses and initialize current icon
    init: function() {
        var iconClasses = this.get('iconClass').split(',');
        this.set('iconClasses', iconClasses);
        this.set('classIndex', 0);
        this.set('icons', { primary: iconClasses[0] });
        this._super();
    },

    // Capture click event and invoke appropriate action function
    click: function() {
        // Call action function from controller provided using onClick
        this.get('controller')._actions[this.get('onClick')].call(null, this.get('controller'));

        // Change icon class to next available from the list
        this.set('classIndex', this.get('classIndex') + 1);

        if (this.get('iconClasses')) {
            this.set('icons', { primary: 
                                this.get('iconClasses')[this.get('classIndex')
                                        % this.get('iconClasses').length]});
        }
    }
})

/*
 * Extend ButtonView to defined Enter button with label
 */
Clira.EnterButton = JQ.ButtonView.extend({
    label: 'Enter',

    click: function() {
        this.get('parentView').CommandInput.insertNewline();
    }
})


/*
 * View to handle most recently used commands list pulldown. This view is 
 * displayed when user clicks on pulldown icon.
 */
Clira.MruPulldownView = Ember.View.extend({
    classNames: ['ui-menu', 'pulldown'],

    // Hide the view when not in focus
    mouseLeave: function() {
        this.set('isVisible', false);
    },

    // Observe controller's visible property and change visibility
    toggleVisibility: function() {
        this.toggleProperty('isVisible');
    }.observes('controller.visible')
});


/*
 * View to display commands in mru pulldown list
 */
Clira.MruItemView = Ember.View.extend({
    classNames: ['mru-item'],

    click: function() {
        var commandInputView = this.get('parentView').get('parentView')
                                   .CommandInput;
        // Set the command
        commandInputView.get('targetObject').set('command', this.content);
        commandInputView.$().focus();

        // Hide mru pulldown view
        this.get('parentView').get('controller').toggleProperty('visible');
    }
});


/*
 * View to display message along with an icon. Content passed to this view
 * should contain a 'message', 'type' and optional 'noIcon' boolean. Types 
 * 'error' and 'highlight' comes default with jquery-ui. When other types 
 * are used, make sure we define corresponding ui-state-<type> class in 
 * stylesheet
 */
Clira.MessageView = Ember.View.extend({
    templateName: "clira_message",
    uiType: function() {
        return "ui-state-" + this.get('content').type;
    }.property('content.type')
});


/*
 * View for clira preferences button
 */
Clira.PrefsButtonView = Ember.View.extend({
    classNames: ['prefsbtn'],

    // Create a preferences dialog as childView and append
    click: function() {
        var content = {
            command: 'edit preferences',
            context: this,
        }
        $.clira.executeCommand('edit preferences', content);
    }
});


/*
 * View extending dynamic forms to handle displaying and saving clira
 * preferences using localStorage backed ember-restless
 */
Clira.GeneralPrefView = Clira.DynFormView.extend({
    title: "Preferences",
    buttons: {
        cancel: function() {
            this.get('parentView').destroy();
        },
        save: function() {
            var clira_prefs = $.clira.prefs;
            // Iterate fieldValues and save them back into Clira.Preference
            $.each(viewContext.get('fieldValues'), function(k, v) {
                var pref = Clira.Preference.find(k);
                if (pref) {
                    pref.set('value', v);
                    pref.saveRecord();

                    // Update $.clira.pref
                    clira_prefs[k] = v;
                }
            });
            this.get('parentView').destroy();
        }
    }
});


/*
 * View to display a map. Reads latitude and longitude data from map object in
 * context along with required height of the map
 */
Clira.MapView = Ember.View.extend({
    tagName : 'div',
    attributeBindings: ['style'],
    style: null,

    didInsertElement : function() {
        this._super();

        var context = this.get('context');

        this.set('style', "position: relative;");

        if (context && context.height) {
            this.set('style', 
                        this.get('style') + "height:" + context.height + ";");
        }

        if (context) {
            var map = new GMaps({
                div: $("#" + this.get('elementId')).get(0),
                lat: context.lat,
                lng: context.lng,
                center: new google.maps.LatLng(context.lat, context.lng)
            });

            map.addMarker({
                lat: context.lat,
                lng: context.lng,
                title: context.address
            });
        }
    }
});
