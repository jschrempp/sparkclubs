import React from 'react';

const About: React.FC = () => {
  return (
    <div className="page-container">
      <div className="content">
        <h1>About This Software</h1>
        <p>
            (In the text below I will put in <b>bold</b> the parts that were written by AI (CoPilot); it 
            infects even <b>my own writing!</b>)
        </p>
        <p>
            NOTE: This application is just a demo. I might flush and reset the data at any time. If you
            decide to add real data to your account, then use the export feature to save your
            data; it might disappear WITHOUT WARNING!
        </p>

        <p> UPDATE: The application began as a bookclub app, described below. It was fun, but there are 
            alternatives. My friends talked about starting an AI discussion group and were wondering how
            to pick topics. I realized that this is the same problem as the bookclubs, but with discussion
            topics instead of books! A few iterations later and CoPilot had changed it to be what it is now.

            I also used CoPilot to help me deploy this app into the Railway.com cloud service. That was a bit
            frustrating as CoPilot could not figure out why it was not working. After having to double my 
            tokens CoPilot finally discovered that Railway required the use of a specific MySQL access 
            library. Then it worked. I had almost given up.
        </p>

        <p>
            March 2026: Two weeks ago I decided to build this web application without ANY coding. Everything 
            <b>you see here, from the frontend to the backend, was created using no-code/low-code tools. </b>
            I used CoPilot Claude Sonet 4.5 to do the work. I started with a specification, about
            a page long. I asked CoPilot to improve the specification, adding any features it thought
            (&quot;thought&quot;?) would be useful. Then I typed, &quot;make the app from the specification.&quot; Wow, it 
            did it.
        </p>
        <p>
            Then came a long process of finding the most basic of bugs - a page didn&apos;t work, there was no 
            button to edit a book, an error when listing the users - and asking CoPilot to fix them. Which
            it did. 
        </p>
        <p>
            <b>I then asked CoPilot to add features - an admin page, a page to list my books, a header with
            navigation links. Each time, CoPilot produced the code, and I tested it. If there were bugs,
            I asked CoPilot to fix them.</b>
        </p>
        <p>
            After a good night&apos;s sleep I&apos;d wake up to a few new features to add. And now here we are. 
            <b> A fully functional web application, built without writing a single line of code myself.
            I&apos;m amazed at how far no-code/low-code tools have come, and excited to see what the future
            holds for software development.</b>
        </p>
        <p>
            Let me stress that what you see here is completely AI generated. I have not written a single
            line of code. It consists, as of today, of 8,500 lines of code in 32 different files. I have not 
            looked at one single line of code. It is in a private GitHub repository; if you want to see it,
            let me know.
        </p>
        <p>
            <b>- Jimmy Songer<br />
            June 2024<br />
            Jim @JimmySonger.com<br />
            JimmySonger.com</b><br /><br />

            I don&apos;t know who Jimmy Songer is, maybe CoPilot made him up? Or that&apos;s where it stole this code? 
            If so, then thank you Jimmy Songer. <br /><br />
            Jim Schrempp<br />
            jim@jimschrempp.com<br />
            February 2026
        </p>

        <p>
            The rest of this page was written completely by CoPilot.
        </p>
        <hr />
        <h1>About Spark Clubs</h1>
        <p>
          Welcome to Spark Clubs, a collaborative platform for discussion enthusiasts to discover, 
          explore, and connect over shared intellectual interests.
        </p>
        
        <h2>Our Mission</h2>
        <p>
          We believe that discussion is a social experience. Spark Clubs brings together thinkers 
          from all backgrounds to explore ideas, share perspectives, and build meaningful 
          connections through the topics we discuss.
        </p>
        
        <h2>Features</h2>
        <ul>
          <li>Browse and join discussion clubs based on your interests</li>
          <li>Discover new topics and recommendations from club members</li>
          <li>Connect with fellow thinkers and discussion enthusiasts</li>
          <li>Participate in engaging conversations about thought-provoking topics</li>
          <li>Track your involvement across multiple clubs</li>
          <li>Express interest in topics or volunteer to lead discussions</li>
          <li>RSVP to upcoming events and meetings</li>
        </ul>
        
        <h2>Contact & Support</h2>
        <p>
          Have questions or feedback? We&apos;d love to hear from you! Reach out to us at support@sparkclubs.com.
        </p>
      </div>
    </div>
  );
};

export default About;