'use client'

import { useEffect, useRef } from 'react'
import mermaid from 'mermaid'
import { useAuth } from '@/app/AuthContext';
import Header from '@/app/Header';
import Footer from '@/app/Footer';

mermaid.initialize({
  startOnLoad: false,
  theme: 'default',
})

export default function HowTo() {
  const { isAuthenticated, username, checkAuthStatus } = useAuth();
  const containerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!containerRef.current) return

    // Tell mermaid to render any .mermaid classed elements inside this component
    mermaid.run({
      nodes: containerRef.current.querySelectorAll('.mermaid'),
    })
  }, [])

  return (
    <div>
      <Header 
        isAuthenticated={isAuthenticated}
        username={username}
        onAuthChange={checkAuthStatus}
      />
      <section ref={containerRef}>
        <style jsx global>{`
        body {
           font-family: Helvetica, arial, sans-serif;
           font-size: 14px;
           line-height: 1.6;
           padding-bottom: 10px;
           background-color: white;
        }

        body > *:first-child {
           margin-top: 0 !important;
        }
        body > *:last-child {
           margin-bottom: 0 !important;
        }

        a {
           color: #4183C4; }
        a.absent {
           color: #cc0000; }
        a.anchor {
           display: block;
           padding-left: 30px;
           margin-left: -30px;
           cursor: pointer;
           position: absolute;
           top: 0;
           left: 0;
           bottom: 0; }

        h1, h2, h3, h4, h5, h6 {
           margin: 20px 0 10px;
           padding: 0;
           font-weight: bold;
           -webkit-font-smoothing: antialiased;
           cursor: text;
           position: relative; }

        h1:hover a.anchor, h2:hover a.anchor, h3:hover a.anchor, h4:hover a.anchor, h5:hover a.anchor, h6:hover a.anchor {
           text-decoration: none; }

        h1 tt, h1 code {
           font-size: inherit; }

        h2 tt, h2 code {
           font-size: inherit; }

        h3 tt, h3 code {
           font-size: inherit; }

        h4 tt, h4 code {
           font-size: inherit; }

        h5 tt, h5 code {
           font-size: inherit; }

        h6 tt, h6 code {
           font-size: inherit; }

        h1 {
           font-size: 28px;
           color: black; }

        h2 {
           font-size: 24px;
           border-bottom: 1px solid #cccccc;
           color: black; }

        h3 {
           font-size: 18px; }

        h4 {
           font-size: 16px; }

        h5 {
           font-size: 14px; }

        h6 {
           color: #777777;
           font-size: 14px; }

        p, blockquote, ul, ol, dl, li, table, pre {
           margin: 15px 0; }

        hr {
           color: #333333;
           height: 4px;
           padding: 0;
        }

        section {
          width: 854px;
          margin: 0 auto;
        }

        body > h2:first-child {
           margin-top: 0;
           padding-top: 0; }
        body > h1:first-child {
           margin-top: 0;
           padding-top: 0; }
        body > h1:first-child + h2 {
           margin-top: 0;
           padding-top: 0; }
        body > h3:first-child, body > h4:first-child, body > h5:first-child, body > h6:first-child {
           margin-top: 0;
           padding-top: 0; }

        a:first-child h1, a:first-child h2, a:first-child h3, a:first-child h4, a:first-child h5, a:first-child h6 {
           margin-top: 0;
           padding-top: 0; }

        h1 p, h2 p, h3 p, h4 p, h5 p, h6 p {
           margin-top: 0; }

        li p.first {
           display: inline-block; }
        li {
           margin: 0; }
        ul, ol {
           padding-left: 30px; }

        ul :first-child, ol :first-child {
           margin-top: 0; }

        dl {
           padding: 0; }
        dl dt {
           font-size: 14px;
           font-weight: bold;
           font-style: italic;
           padding: 0;
           margin: 15px 0 5px; }
        dl dt:first-child {
           padding: 0; }
        dl dt > :first-child {
           margin-top: 0; }
        dl dt > :last-child {
           margin-bottom: 0; }
        dl dd {
           margin: 0 0 15px;
           padding: 0 15px; }
        dl dd > :first-child {
           margin-top: 0; }
        dl dd > :last-child {
           margin-bottom: 0; }

        blockquote {
           border-left: 4px solid #dddddd;
           padding: 0 15px;
           color: #777777; }
        blockquote > :first-child {
           margin-top: 0; }
        blockquote > :last-child {
           margin-bottom: 0; }

        table {
           padding: 0;border-collapse: collapse; }
        table tr {
           border-top: 1px solid #cccccc;
           background-color: white;
           margin: 0;
           padding: 0; }
        table tr:nth-child(2n) {
           background-color: #f8f8f8; }
        table tr th {
           font-weight: bold;
           border: 1px solid #cccccc;
           margin: 0;
           padding: 6px 13px; }
        table tr td {
           border: 1px solid #cccccc;
           margin: 0;
           padding: 6px 13px; }
        table tr th :first-child, table tr td :first-child {
           margin-top: 0; }
        table tr th :last-child, table tr td :last-child {
           margin-bottom: 0; }

        img {
           max-width: 100%; }

        span.frame {
           display: block;
           overflow: hidden; }
        span.frame > span {
           border: 1px solid #dddddd;
           display: block;
           float: left;
           overflow: hidden;
           margin: 13px 0 0;
           padding: 7px;
           width: auto; }
        span.frame span img {
           display: block;
           float: left; }
        span.frame span span {
           clear: both;
           color: #333333;
           display: block;
           padding: 5px 0 0; }
        span.align-center {
           display: block;
           overflow: hidden;
           clear: both; }
        span.align-center > span {
           display: block;
           overflow: hidden;
           margin: 13px auto 0;
           text-align: center; }
        span.align-center span img {
           margin: 0 auto;
           text-align: center; }
        span.align-right {
           display: block;
           overflow: hidden;
           clear: both; }
        span.align-right > span {
           display: block;
           overflow: hidden;
           margin: 13px 0 0;
           text-align: right; }
        span.align-right span img {
           margin: 0;
           text-align: right; }
        span.float-left {
           display: block;
           margin-right: 13px;
           overflow: hidden;
           float: left; }
        span.float-left span {
           margin: 13px 0 0; }
        span.float-right {
           display: block;
           margin-left: 13px;
           overflow: hidden;
           float: right; }
        span.float-right > span {
           display: block;
           overflow: hidden;
           margin: 13px auto 0;
           text-align: right; }

        code, tt {
           margin: 0 2px;
           padding: 0 5px;
           white-space: nowrap;
           border: 1px solid #eaeaea;
           background-color: #f8f8f8;
           border-radius: 3px; }

        pre code {
           margin: 0;
           padding: 0;
           white-space: pre;
           border: none;
           background: transparent; }

        .highlight pre {
           background-color: #f8f8f8;
           border: 1px solid #cccccc;
           font-size: 13px;
           line-height: 19px;
           overflow: auto;
           padding: 6px 10px;
           border-radius: 3px; }

        pre {
           background-color: #f8f8f8;
           border: 1px solid #cccccc;
           font-size: 13px;
           line-height: 19px;
           overflow: auto;
           padding: 6px 10px;
           border-radius: 3px; }
        pre code, pre tt {
           background-color: transparent;
           border: none; }

        sup {
           font-size: 0.83em;
           vertical-align: super;
           line-height: 0;
        }
        * {
           -webkit-print-color-adjust: exact;
        }
        @media screen and (min-width: 914px) {
           body {
              margin:0 auto;
           }
        }
        @media print {
           table, pre {
              page-break-inside: avoid;
           }
           pre {
              word-wrap: break-word;
           }
        }
      `}</style>
        <h1>How to Use An Leabharlann Ghaelach</h1>
        <p>Welcome to <strong>An Leabharlann Ghaelach</strong>, a database for Irish and Celtic source texts. This website will allow users to log and cite texts, keep track of secondary analyses, and discover new texts in the network. An Leabharlann will help keep track of all editions and translations of a text and where they can be found online.</p>
        <h2>Directory</h2>
        <ul>
          <li><a href="#1">1. A Graph Database</a></li>
          <li><a href="#2">2. How is the Database Structured?</a></li>
          <li><a href="#labels">Labels</a></li>
        </ul>
        <p><a id="1"></a></p>
        <h3>1. A Graph Database</h3>
        <p><a href="https://neo4j.com" target="_blank">Neo4j</a> is a graph database language designed to store data as <strong>nodes</strong>, and connections between data as <strong>relationships</strong>. Unlike traditional databases that use tables, Neo4j organizes data into a graph structure, making it ideal for representing complex relationships, such as those between authors, texts, editions, publishers, websites, and text versions in this application.</p>
        <ul>
          <li><strong>Nodes</strong>: Represent entities like Authors, Texts, or Publishers. Any data which might have multiple data points under it should be a node with properties. Each node has labels (e.g., 'Author', 'Text') and properties (e.g., 'name: "Jane Doe"').</li>
          <li><strong>Relationships</strong>: Connect nodes through relationships like A 'WROTE' B or C 'PUBLISHED' D, allowing us to model how entities are related.</li>
        </ul>
        <p>A node has properties, and a relationship connects nodes. For example, if we had a node for Homer, it would look like this:</p>
        <div className="mermaid">
          {`graph LR
            H((Author<br>name: Homer<br>born: 8th c. BC))`}
        </div>      
        <p>And if we had a node for the Iliad, it could look like this:</p>
        <div className="mermaid">
          {`graph LR
            I((Text<br>title: The Iliad<br>language: Ancient Greek))`}
        </div>
        <p>Then we could relate them by saying that Homer WROTE The Iliad:</p>
        <div className="mermaid">
          {`graph LR
            H((Author<br>name: Homer<br>born: 8th c. BC)) -->|WROTE| I((Text<br>title: The Iliad<br>language: Ancient Greek))`}
        </div>
        <p>You can see that each node is given a <strong>label</strong>, here "Author" and "Text". The name of the author and title of the text are properties stored <em>within</em> a node. All nodes have labels telling you what they <em>are</em>, while the properties of a node tell you <em>about</em> the data stored within. So Homer IS AN Author, and the Iliad IS A Text. This feature will become useful later when we discuss searching through the database. Note that a node can have an arbitrary number of labels, e.g. James Clarence Mangan IS AN Author and IS A Translator.</p>
        <p><a id="2"></a></p>
        <h3>2. How is the Database Structured?</h3>
        <p>Due to the complexity of relationships in the humanities, no rigid structure could ever capture the unruly relationships of a humanities database without itself becoming unruly. But Neo4j allows users to set relationships that could be unique, as well as relationships that are extremely common. To capture all of these, users can create many different labels to suit their needs.</p>
        <p>A node consists of a <strong>label</strong> and a list of <strong>properties</strong> and their values. There is no limit on what a label or property could be, although the value of a property must be a string or simple array, not a JSON object.</p>
        <p>For example, the <em>Audacht Morainn</em> is a medieval Irish document. It is a <strong>Text</strong>. But Fergus Kelly's 1970 translation of the <em>Audacht Morainn</em> is an <strong>Edition</strong> and a <strong>Translation</strong> of that Text, not a Text itself. The two are connected with an EDITION_OF relationship. And Fergus Kelly TRANSLATED the <em>Audacht Morainn</em>. So we can create nodes with those properties, and connect them:</p>
        <div className="mermaid">
          {`graph LR
            F((Fergus Kelly<br>Author Translator<br>name: Fergus Kelly)) -->|WROTE| E((Edition<br>title: Audacht Morainn<br>publication_date: 1970))
            F -->|TRANSLATED| T((Text<br>title: Audacht Morainn))
            E -->|EDITION_OF| T

            class F person
            class E edition
            class T text`}
        </div>
        <p>See <a href="#labels">Labels</a> below for a full list of all labels used and how to use them.</p>
        <h3>3. Logging In</h3>
        <h3>4. The Homepage</h3>
        <p>Columns, searching, and logging in.</p>
        <h3>5. Creating a Node</h3>
        <p>Creating a node, adding labels, node properties, and relationships.</p>
        <h3>6. Relationships</h3>
        <p>Nodes connect to each other through relationships.</p>
        <p><a id="labels"></a></p>
        <h2>Labels</h2>
        <p>A list of all currently used labels and when / how to use each:</p>
        <p><a id="author"></a></p>
        <h3>Author</h3>
        <blockquote>
        <p>Used for all people who write, edit, or translate a <a href="#text">Text</a>.</p>
        </blockquote>
        <p><a id="text"></a></p>
        <h3>Text</h3>
        <blockquote>
        <p>A Text is the pure form of a document or writing, the Platonic ideal of a text, not associated with any edition or translation.</p>
        <p>For example, the Iliad is a Text, written by Homer. Robert Fagles' 1990 book titled "The Iliad" by Homer, published by Penguin Classics, in which he translates the epic into English, is also the Iliad by Homer, but not the pure Text itself. Rather, it is an Edition and Translation of the Text.</p>
        <p>The Text is an umbrella category under which are organized all other nodes related to that Text.</p>
        <p>Works that count as commentary on another text are <a href="#commentary">Commentaries</a> and also <a href="#text">Texts</a> themselves, and can also be <a href="#article">Articles</a>. If there exists only one Edition of a Text, then "Text" and "Edition" can be applied to the same node.</p>
        </blockquote>
        <p><a id="edition"></a></p>
        <h3>Edition</h3>
        <blockquote>
        <p>A printed or published instantiation of a <a href="#text">Text</a>, which appears on its own as a standalone book or article, or is published in a journal, or is contained in an anthology. If, however, there exists only one Edition of a Text, then "Text" and "Edition" can be applied to the same node.</p>
        <p>A book like <em>The Lord of the Rings: Return of the King</em> is a Text, and all the many printings and reprintings of that book are its <strong>Editions</strong>; but at the same time, a Text like the <em>Bretha Déin Chécht</em> was published in <em>Ériu</em> Vol. XX, along with a new translation, and both the original text and translation count as <strong>Editions</strong> of the original Text.</p>
        </blockquote>
        <p><a id="version"></a></p>
        <h3>Version</h3>
        <blockquote>
        <p>A Version represents a major variant of a <a href="#text">Text</a>. Whereas an <a href="#edition">Edition</a> represents a variation in the form of a work, how it appears, a Version represent a variation in content. A single Version implies the existence of other Versions from which it deviates. A Version should not also be a Text.</p>
        <p>For example, the <a href="https://uisneac.com/leabharlann/info/index.html?id=086bc4d3-d5a0-4db6-aeca-2bf91eda6bea">Táin Bó Cúailnge</a> is a Text which is known to us from multiple manuscript editions which differ in content, so we represent each recension as a different Version, e.g. <a href="https://uisneac.com/leabharlann/info/index.html?id=4e9e7e5c-3cd1-452c-8903-e6b73f68fd59">Táin Bó Cúailnge (Recension II)</a>. They are linked with the <a href="#version-of">VERSION_OF</a> relationship.</p>
        </blockquote>
        <p><a id="publisher"></a></p>
        <h3>Publisher</h3>
        <blockquote>
        <p>An organization or person that publishes works on any medium.</p>
        </blockquote>
        <p><a id="translation"></a></p>
        <h3>Translation</h3>
        <blockquote>
        <p>A Translation is an Edition which has been translated from its native language to another language. A Translation must have a <a href="#translator">Translator</a> and derive from a source <a href="#text">Text</a> or <a href="#version">Version</a>, which represents the work in its native language (though these requirements aren't enforced in the database code).</p>
        <p>Certain ancient Texts can also be Translations. For example, the <a href="https://en.wikipedia.org/wiki/Vulgate">Latin Vulgate Bible</a> is a translation of a number of previous Biblical texts in Old Italic, Greek, Hebrew, etc., translated by Saint Jerome; yet it is an important divergence from those source texts in its own right, and there are many <a href="#Version">Versions</a> of the Vulgate, so it may be both a Text, not an Edition, and a Translation at once.</p>
        </blockquote>
        <p><a id="translator"></a></p>
        <h3>Translator</h3>
        <blockquote>
        <p>A Translator is any person who translates a <a href="#text">Text</a> from one language to another.</p>
        </blockquote>
        <p><a id="commentary"></a></p>
        <h3>Commentary</h3>
        <blockquote>
        <p>A Commentary is a <a href="#text">Text</a> which is concerned in whole or in part with commentary on or critique of another Text.</p>
        <p>For example, the <em>Cath Maige Tuired</em> of Irish mythology is a <a href="https://uisneac.com/leabharlann/info/index.html?id=6b8fab4d-3722-4b49-80fb-a0a9c014da31">Text</a>, and the <a href="#article">Article</a> by <a href="https://uisneac.com/leabharlann/info/index.html?id=c6673cd9-c00e-4a53-a46d-800c10f2f5e9">Tomás Ó Cathasaigh</a> called <a href="https://uisneac.com/leabharlann/info/index.html?id=bb36e67e-0361-4355-bdf3-d7144af4d48f"><em>Three Notes on the Cath Maige Tuired</em></a> is a Text and a Commentary on another Text.</p>
        </blockquote>
        <p><a id="journal"></a></p>
        <h3>Journal</h3>
        <blockquote>
        <p>A Journal is an academic publication which periodically presents <a href="#article">Articles</a> on a given subject, contained within <a href="#issue">Issues</a>. An Issue is linked to its Journal via the <a href="#issue-of">ISSUE_OF</a> relationship.</p>
        <p>For example, <a href="https://uisneac.com/leabharlann/info/index.html?id=949c5778-ece0-4e31-ac11-0d5962021771">Revue Celtique</a> is a Journal which publishes <a href="#issue">Issues</a> such as <a href="https://uisneac.com/leabharlann/info/index.html?id=feb1dfcc-699b-487a-bace-a58dbabcdb61">Revue Celtique Tome 9</a>.</p>
        </blockquote>
        <h3>Issue</h3>
        <blockquote>
        <p>An Issue is a publication of a <a href="#journal">Journal</a> which contains the <a href="#article">Articles</a> presented by the journal. An Issue is linked to its Journal via the <a href="#issue-of">ISSUE_OF</a> relationship.</p>
        <p>For example, <a href="https://uisneac.com/leabharlann/info/index.html?id=949c5778-ece0-4e31-ac11-0d5962021771">Revue Celtique</a> is a Journal which publishes <a href="#issue">Issues</a> such as <a href="https://uisneac.com/leabharlann/info/index.html?id=feb1dfcc-699b-487a-bace-a58dbabcdb61">Revue Celtique Tome 9</a>.</p>
        </blockquote>
        <h2>Relationships</h2>
        <h3>WROTE</h3>
        <blockquote>
        <p>Points from an <a href="#Author">Author</a> to a <a href="#Text">Text</a> or <a href="#Edition">Edition</a> that he wrote. This should also be used for the editor of a work, even if that person didn't specifically author the text itself.</p>
        </blockquote>
        <p><a id="editor"></a></p>
        <h3>EDITED</h3>
        <blockquote>
        <p>Used between an Editor and the Edition he has edited. The person doing the editing is classed as an <a href="#author">Author</a>, but the act of editing is differentiated as any non-creative compilation, rearrangement, or reprinting.</p>
        </blockquote>
        <h3>PUBLISHED</h3>
        <p><a id="published-in"></a></p>
        <h3>PUBLISHED_IN</h3>
        <blockquote>
        <p>Used on a <a href="#text">Text</a> or <a href="#article">Article</a> to indicate the Journal <a href="#issue">Issue</a>, <a href="#book">Book</a>, or other publication that the Text is published within. Should point from the Text to the Journal.</p>
        </blockquote>
        <h3>TRANSLATED</h3>
        <p><a id="version-of"></a></p>
        <h3>VERSION_OF</h3>
        <blockquote>
        <p>Used to link a <a href="#version">Version</a> to the <a href="#text">Text</a> that it is a version of.</p>
        </blockquote>
        <p><a id="issue-of"></a></p>
        <h3>ISSUE_OF</h3>
        <blockquote>
        <p>Used on an <a href="#issue">Issue</a> to indicate the <a href="#journal">Journal</a> or other publication to which the Issue belongs. Should always point from the Issue to a Journal.</p>
        </blockquote>
      </section>
      <Footer />
    </div>
  );
}
