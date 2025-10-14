(function(storyContent) {

    // Create ink story from the content using inkjs
    var story = new inkjs.Story(storyContent);

    var savePoint = "";

    var activeSection = undefined;

    var storyContainer = document.querySelector('#story');
    //var outerScrollContainer = document.querySelector('.outerContainer');

    // page features setup
    //setupTheme(globalTagTheme);
    //var hasSave = loadSavePoint();
    //setupButtons(hasSave);

    // Set initial save point
    savePoint = story.state.toJson();

    var additionalSectionNames = {
        'animreel': 'sticky',
        'paintings': 'big',
        'digital': 'big',
        'lifedrawing': 'sticky'
    };

    var bigBgPaper = "images/assets/bigbgpaper.webp";
    var lilBgPaper = "images/assets/lilbgpaper.webp";
    var tallBgPaper = "images/assets/tallbgpaper.webp";

    var windowWidth = window.matchMedia("(max-width: 550px)");

    setMobilePaper(windowWidth);

    windowWidth.addEventListener("change", function() {
        setMobilePaper(windowWidth);
    })



    try {
        let savedState = window.localStorage.getItem('save-state');
        if (savedState) story.state.LoadJson(savedState);
    } catch (e) {
        console.debug("Couldn't load save state");
    }


     // Kick off the start of the story!
    continueStory(true);

    // Main story processing function. Each time this is called it generates
    // all the next content up as far as the next set of choices.
    function continueStory(firstTime) {

        var delay = 0.0;

        // Don't over-scroll past new content
        var previousBottomEdge = firstTime ? 0 : contentBottomEdgeY();

        // Generate story text - loop through available content
        while(story.canContinue) {

            // Get ink to generate the next paragraph
            var paragraphText = story.Continue();
            var tags = story.currentTags;

            // Any special tags included with this line
            var customClasses = [];
            for(var i=0; i<tags.length; i++) {
                var tag = tags[i];

                // Detect tags of the form "X: Y". Currently used for IMAGE and CLASS but could be
                // customised to be used for other things too.
                var splitTag = splitPropertyTag(tag);
				splitTag.property = splitTag.property.toUpperCase();

                // AUDIO: src
                if( splitTag && splitTag.property == "AUDIO" ) {
                  if('audio' in this) {
                    this.audio.pause();
                    this.audio.removeAttribute('src');
                    this.audio.load();
                  }
                  this.audio = new Audio(splitTag.val);
                  this.audio.play();
                }

                // AUDIOLOOP: src
                else if( splitTag && splitTag.property == "AUDIOLOOP" ) {
                  if('audioLoop' in this) {
                    this.audioLoop.pause();
                    this.audioLoop.removeAttribute('src');
                    this.audioLoop.load();
                  }
                  this.audioLoop = new Audio(splitTag.val);
                  this.audioLoop.play();
                  this.audioLoop.loop = true;
                }

                // IMAGE: src
                if( splitTag && splitTag.property == "IMAGE" ) {
                    var imageElement = document.createElement('img');
                    imageElement.src = splitTag.val;
                    storyContainer.appendChild(imageElement);

                    showAfter(delay, imageElement);
                    delay += 200.0;
                }

                // LINK: url
                else if( splitTag && splitTag.property == "LINK" ) {
                    window.location.href = splitTag.val;
                }

                // LINKOPEN: url
                else if( splitTag && splitTag.property == "LINKOPEN" ) {
                    window.open(splitTag.val);
                }

                // BACKGROUND: src
                //else if( splitTag && splitTag.property == "BACKGROUND" ) {
                //    outerScrollContainer.style.backgroundImage = 'url('+splitTag.val+')';
                //}

                // CLASS: className
                else if( splitTag && splitTag.property == "CLASS" ) {
                    customClasses.push(splitTag.val);
                }

                // CLEAR - removes all existing content.
                // RESTART - clears everything and restarts the story from the beginning
                else if( tag == "CLEAR" || tag == "RESTART" ) {
                    removeAll("p");
                    removeAll("img");

                    if( tag == "RESTART" ) {
                        restart();
                        document.getElementById("fromsavenotif").innerHTML = ""
                        return;
                    }
                }
            }
		
		// Check if paragraphText is empty
		if (paragraphText.trim().length == 0) {
                continue; // Skip empty paragraphs
		}

            // Create paragraph element (initially hidden)
            var paragraphElement = document.createElement('p');
            paragraphElement.innerHTML = paragraphText;
            paragraphElement.classList.add("inktext");
            storyContainer.appendChild(paragraphElement);

            // Add any custom classes derived from ink tags
            for(var i=0; i<customClasses.length; i++)
                paragraphElement.classList.add(customClasses[i]);

            // Fade in paragraph after a short delay
            showAfter(delay, paragraphElement);
            delay += 200.0;
        }

        // Create HTML choices from ink choices
        story.currentChoices.forEach(function(choice) {

            // Create paragraph with anchor element
            var choiceTags = choice.tags;
            var customClasses = [];
            var section = "";
            var isClickable = true;
            var isBack = false;

            for(var i=0; i<choiceTags.length; i++) {
                var choiceTag = choiceTags[i];
                var splitTag = splitPropertyTag(choiceTag);
				splitTag.property = splitTag.property.toUpperCase();

                if(choiceTag.toUpperCase() == "UNCLICKABLE"){
                    isClickable = false;
                }
                if( splitTag && splitTag.property == "CLASS" ) {
                    customClasses.push(splitTag.val);
                }
                if( splitTag && splitTag.property == "SECTION" ) {
                    section = splitTag.val;
                }
            }

            var choiceEl;

            if (choice.text.includes("go back")) {
                isBack = true;
            }
            if (section == "bottomhome") {
                isBack = true;
                customClasses.push("bottomaligned");
                section = "home";
            }
            if (isBack) {
                var backEl = document.getElementById("goback");
                if (!backEl.innerText.includes("back")) {
                    showAfter(delay, backEl);
                    delay += 200.0;
                }
                backEl.innerHTML = `<a href='#home'>${choice.text}</a>`;
                choiceEl = backEl;
            } else {
                var choiceParagraphElement = document.createElement('p');
                choiceParagraphElement.classList.add("choice");
                choiceParagraphElement.classList.add("notback");

                for(var i=0; i<customClasses.length; i++)
                    choiceParagraphElement.classList.add(customClasses[i]);
                    
                if(isClickable){
                    choiceParagraphElement.innerHTML = `<a href='#${section}'>▷ ${choice.text}</a>`;
                }else{
                    choiceParagraphElement.innerHTML = `<span class='unclickable'>▷ ${choice.text}</span>`;
                }
                storyContainer.appendChild(choiceParagraphElement);

                // Fade choice in after a short delay
                showAfter(delay, choiceParagraphElement);
                delay += 200.0;
                choiceEl = choiceParagraphElement;
            }





            // Click on choice
            if(isClickable){
                var choiceAnchorEl = choiceEl.querySelectorAll("a")[0];
                choiceAnchorEl.addEventListener("click", function(event) {

                    // Extend height to fit
                    // We do this manually so that removing elements and creating new ones doesn't
                    // cause the height (and therefore scroll) to jump backwards temporarily.
                        //storyContainer.style.height = contentBottomEdgeY()+"px";

                    // Remove all existing choices
                    removeAll(".choice");
                    // Clear prev Ink-generated text as well
                    removeAll(".inktext");
                    //let addDivEl = document.getElementById("additional-sections")
                    if (section == "default" || isBack || section == "") {
                        let sectNames = Object.getOwnPropertyNames(additionalSectionNames); //bgpaper
                        //let additionalEls = addDivEl.children
                        for (let i=0; i<sectNames.length; i++) {
                            let additionalEl = document.getElementById("div-" + sectNames[i]);
                            try {
                                additionalEl.classList.add("invisible");
                                choiceEl.innerHTML = "<br>";
                            } catch{}
                        }
                        if (!isBack) {
                            // Don't follow <a> link
                            event.preventDefault();
                            document.getElementById("goback").innerHTML = "<br>";
                        }
                        setMobilePaper(windowWidth, "big")
                        showAfter(0.0,document.getElementById("banjo"));
                        
                    } else {
                        let optionalnakd = "";
                        if (section.includes("lifedrawing")) {
                            optionalnakd = section.substring(11);
                            console.log(optionalnakd);
                            section = "lifedrawing";
                        }
                        let sectNames = Object.getOwnPropertyNames(additionalSectionNames); //bgpaper
                        for (let i=0; i<sectNames.length; i++) {
                            let additionalEl = document.getElementById("div-" + sectNames[i]);
                            try {
                                additionalEl.classList.add("invisible");
                            }catch{}
                        }
                        try {
                            var sectionEl = document.getElementById("div-" + section);
                            setMobilePaper(windowWidth, additionalSectionNames[section])
                            showAfter(200.0, sectionEl);
                            
                            if (optionalnakd == 'nothx') {
                                let nakdPics = document.getElementsByClassName('nakd');
                                for (let i=0; i< nakdPics.length; i++) {
                                    nakdPics[i].classList.add("invisible");
                                }
                            } else if (optionalnakd == 'yes') {
                                let nakdPics = document.getElementsByClassName('nakd');
                                for (let i=0; i< nakdPics.length; i++) {
                                    showAfter(0.0, nakdPics[i]);
                                }
                            }
                        }
                        catch {
                        }
                    }

                    // Tell the story where to go next
                    story.ChooseChoiceIndex(choice.index);
                    console.log(choice.index);

                    // Set save point
                    savePoint = story.state.toJson();
                    //Save page
                    savePage();

                    // Aaand loop
                    continueStory();
                });
            }
        });

		// Unset storyContainer's height, allowing it to resize itself
		storyContainer.style.height = "";


		//make em have our images that alternate <3
		let choiceElementList = document.getElementsByClassName("choice")
        if (choiceElementList.length == 1) {
                choiceElementList[0].className += " choicesolo lastchoice"
        }
		else {
            let alternateArray = [" choicelefta", " choicerighta", " choiceleftb", " choicerightb"]
            let alternateNum = 0
            //console.log("atarting at alternate number " + alternateNum)
            for (let i=0; i<choiceElementList.length; i++) {
                //console.log("alternating to number " + alternateNum + "bc choice list is length of " + choiceElementList.length)
                choiceElementList[i].className += alternateArray[alternateNum]
                alternateNum += 1
                //console.log("alternat number is now " + alternateNum)
                if (alternateNum > 3) {
                    alternateNum = 0
                    //console.log("alternat number is reset to " + alternateNum)
                }

                /*if (i == choiceElementList.length - 1) {
                    choiceElementList[i].className += " lastchoice"
                }*/
            }
        }




    }


    function savePage() {
        try {
                window.localStorage.setItem('save-state', savePoint);
                //document.getElementById("reload").removeAttribute("disabled");
                console.log("Page saved!");
        } catch (e) {
                console.warn("Couldn't save page :(");
        }
    }


    function restart() {
        story.ResetState();

        // set save point to here
        savePoint = story.state.toJson();

        continueStory(true);

        //outerScrollContainer.scrollTo(0, 0);
    }


    // -----------------------------------
    // Various Helper functions
    // -----------------------------------

    // Detects whether the user accepts animations
    function isAnimationEnabled() {
        return window.matchMedia('(prefers-reduced-motion: no-preference)').matches;
    }

    // Fades in an element after a specified delay
    function showAfter(delay, el) {

        if( isAnimationEnabled() ) {
            el.classList.add("hide");
            setTimeout(function() { el.classList.remove("hide") }, delay);
        } else {
            // If the user doesn't want animations, show immediately
            el.classList.remove("hide");
        }
        el.classList.remove("invisible")
    }

    /*
    // Scrolls the page down, but no further than the bottom edge of what you could
    // see previously, so it doesn't go too far.
    function scrollDown(previousBottomEdge) {
        // If the user doesn't want animations, let them scroll manually
        if ( !isAnimationEnabled() || !autoscroll) {
            return;
        }

        // Line up top of screen with the bottom of where the previous content ended
        var target = previousBottomEdge;

        // Can't go further than the very bottom of the page
        var limit = outerScrollContainer.scrollHeight - outerScrollContainer.clientHeight + 30;
        //console.log(`target is {}; limit is {}`, target, limit);
        //if( target < limit ) target = limit;
        target = limit;
        //console.log(`we SCROLLIN to ` + target)

        var start = outerScrollContainer.scrollTop;

        var dist = target - start;
        var duration = 300 + 300*dist/100;
        var startTime = null;
        function step(time) {
            if( startTime == null ) startTime = time;
            var t = (time-startTime) / duration;
            var lerp = 3*t*t - 2*t*t*t; // ease in/out
            outerScrollContainer.scrollTo(0, (1.0-lerp)*start + lerp*target);
            if( t < 1 ) requestAnimationFrame(step);
        }
        requestAnimationFrame(step);
    }

*/
    // The Y coordinate of the bottom end of all the story content, used
    // for growing the container, and deciding how far to scroll.
    function contentBottomEdgeY() {
        //console.log(document.querySelector('#story').lastElementChild.offsetTop + document.querySelector('#story').lastElementChild.offsetTop + 20)
        var bottomElement = storyContainer.lastElementChild;
        //console.log(`bottomElement is equal to `+ String(Number(bottomElement.offsetTop) + Number(bottomElement.offsetHeight) + 20))
        return bottomElement ? bottomElement.offsetTop + bottomElement.offsetHeight + 20 : 0;

    }



    // Remove all elements that match the given selector. Used for removing choices after
    // you've picked one, as well as for the CLEAR and RESTART tags.
    function removeAll(selector)
    {
        var allElements = storyContainer.querySelectorAll(selector);
        for(var i=0; i<allElements.length; i++) {
            var el = allElements[i];
            el.parentNode.removeChild(el);
        }
    }

    // Used for hiding and showing the header when you CLEAR or RESTART the story respectively.
    function setVisible(selector, visible)
    {
        var allElements = storyContainer.querySelectorAll(selector);
        for(var i=0; i<allElements.length; i++) {
            var el = allElements[i];
            if( !visible )
                el.classList.add("invisible");
            else
                el.classList.remove("invisible");
        }
    }

    // Helper for parsing out tags of the form:
    //  # PROPERTY: value
    // e.g. IMAGE: source path
    function splitPropertyTag(tag) {
        var propertySplitIdx = tag.indexOf(":");
        if( propertySplitIdx != null ) {
            var property = tag.substr(0, propertySplitIdx).trim();
            var val = tag.substr(propertySplitIdx+1).trim();
            return {
                property: property,
                val: val
            };
        }

        return null;
    }
/*
    function createLoadOption(id, text) {
        var choiceParagraphElement = document.createElement('p');
        choiceParagraphElement.classList.add("choice");
        choiceParagraphElement.classList.add("choicesolo");

        choiceParagraphElement.innerHTML = `<a href='#' id="${id}">${text}</a>`;
        return choiceParagraphElement;
    }

    function loadOrRestart() {
        try {
            let savedState = window.localStorage.getItem('save-state');
            if (savedState) {
                //console.log( "ok we has a save!")
                let restartButton = createLoadOption("restart", "Restart Story from Beginning");
                let loadButton = createLoadOption("load", "Load Story from Save");

                storyContainer.appendChild(loadButton);
                storyContainer.appendChild(restartButton);
                
                loadButton.addEventListener("click", function(event) {
                    event.preventDefault();
                    storyContainer.style.height = contentBottomEdgeY()+"px";
                    removeAll(".choice");
                    story.state.LoadJson(savedState);
                    continueStory(true);
                });
                restartButton.addEventListener("click", function(event) {
                    event.preventDefault();
                    storyContainer.style.height = contentBottomEdgeY()+"px";
                    removeAll(".choice");
                    restart();
                });
            } 
        } catch (e) {
            console.debug("Couldn't find/load a save state. Starting from scratch :-)");
        }
    }
*/

    function setMobilePaper(windowWidth, paperSize) {
        if (paperSize == "sticky") {
            document.getElementById("bgpaper").src = bigBgPaper;
        } else if (windowWidth.matches) {
            document.getElementById("bgpaper").src = tallBgPaper;
        } else {
            document.getElementById("bgpaper").src = bigBgPaper;
        }
        //document.getElementById("banjo").classList.add('invisible');
    }

    // Loads save state if exists in the browser memory
    function loadSavePoint() {

        try {
            let savedState = window.localStorage.getItem('save-state');
            if (savedState) {
                console.log( "has a save!")
                return true;
            }
        } catch (e) {
            console.debug("Couldn't load save state");
            //document.getElementById("fromsavenotif").innerHTML = ""
        }
        return false;
    }

    // Detects which theme (light or dark) to use
   /* function setupTheme(globalTagTheme) {

        // load theme from browser memory
        var savedTheme;
        try {
            savedTheme = window.localStorage.getItem('theme');
        } catch (e) {
            console.debug("Couldn't load saved theme");
        }

        // Check whether the OS/browser is configured for dark mode
        var browserDark = window.matchMedia("(prefers-color-scheme: dark)").matches;

        if (savedTheme === "dark"
            || (savedTheme == undefined && globalTagTheme === "dark")
            || (savedTheme == undefined && globalTagTheme == undefined && browserDark))
            document.body.classList.add("dark");
    }*/


function buttons() {
    
}
/*
    // Used to hook up the functionality for global functionality buttons
    function setupButtons(hasSave) {

        let rewindEl = document.getElementById("rewind");
        if (rewindEl) rewindEl.addEventListener("click", function(event) {
            removeAll("p");
            removeAll("img");
            setVisible(".header", false);
            restart();
        });

        let saveEl = document.getElementById("save");
        if (saveEl) saveEl.addEventListener("click", function(event) {
            try {
                window.localStorage.setItem('save-state', savePoint);
                document.getElementById("reload").removeAttribute("disabled");
                console.log("state saved!")
                //window.localStorage.setItem('theme', document.body.classList.contains("dark") ? "dark" : "");
            } catch (e) {
                console.warn("Couldn't save state");
            }

        });

        let reloadEl = document.getElementById("reload");
        if (!hasSave) {
            reloadEl.setAttribute("disabled", "disabled");
        }
        reloadEl.addEventListener("click", function(event) {
            if (reloadEl.getAttribute("disabled"))
                return;

            removeAll("p");
            removeAll("img");
            document.getElementById("achievementscontainer").style.display = "none";
            try {
                let savedState = window.localStorage.getItem('save-state');
                if (savedState) story.state.LoadJson(savedState);
            } catch (e) {
                console.debug("Couldn't load save state");
            }
            continueStory(true);
        });

        let animEl = document.getElementById("animtoggle");
       
        if (animEl) animEl.addEventListener("click", function(event) {
            flipautoscroll(true)
        });

        //let themeSwitchEl = document.getElementById("theme-switch");
        //if (themeSwitchEl) themeSwitchEl.addEventListener("click", function(event) {
        //    document.body.classList.add("switched");
        //    document.body.classList.toggle("dark");
        //});
    }
*/    

})(storyContent);

