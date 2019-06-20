# JSP Insights CLI

A command line tool that creates modular JSON models representing JSP(F)s and their
relationship with the struts framework. The tool uses these independent models
to create meaningful assertions about the state of a given JSP(F). For example,
the `remove` command uses a set of criteria (struts entry and tiles definition defined)
derived from the models to determine if a particular JSP(F) is eligible for deletion.

## Installation

Install package depedencies in the root directory

```bash
cd path/to/jsp-insights && npm install
```

Install this local package globally. This will expose the `jsp` command in `$PATH`,
which will allow you to use `jsp` in a terminal anywhere by creating a link
between the binary and the local package.

```bash
cd path/to/jsp-insights && npm install ./ -g
```

Alternatively, you can run this without installing it globally by substituting
`jsp [options] [command]` with `npm start [options] [command]` while inside
the project directory.

## Usage

`jsp [options] [command]`

## Options

`-v`, `--version` output the version number

`-h`, `--help` output usage information

## Commands

### `raw`

Writes `../processor-output/jsp.json`. Represents files with `.jsp` or `.jspf` extension derived from the Stores project

#### `JSPObject`

```json
{
  "fileStats": {
    "dev": 16777220,
    "mode": 33188,
    "nlink": 1,
    "uid": 2011240751,
    "gid": 1536532493,
    "rdev": 0,
    "blksize": 4096,
    "ino": 8615149284,
    "size": 580,
    "blocks": 8,
    "atimeMs": 1560900781646.9019,
    "mtimeMs": 1548812985260.739,
    "ctimeMs": 1548812985260.739,
    "birthtimeMs": 1548812985260.66,
    "atime": "2019-06-18T23:33:01.647Z",
    "mtime": "2019-01-30T01:49:45.261Z",
    "ctime": "2019-01-30T01:49:45.261Z",
    "birthtime": "2019-01-30T01:49:45.261Z",
    "name": "AkamaiCacheIgnore.jspf",
    "type": "file"
  },
  "root": "/Users/kmedley/proj1085_ecommerce_web/WebCommerce/Stores/WebContent",
  "filePath": "/Users/kmedley/proj1085_ecommerce_web/WebCommerce/Stores/WebContent/AkamaiCacheIgnore.jspf"
}
```

---

### `git`

Writes `../processor-output/git-jsp-objects.json`. Takes the output of several `git log <file>` commands, builds an object then outputs to the `git-jsp-objects.json` file. Requires a git repo and jsp.json to be built.

#### `GitJSPObject`

```json
{
  "filePath": "/Users/kmedley/proj1085_ecommerce_web/WebCommerce/Stores/WebContent/AjaxActionErrorResponse.jsp",
  "created": {
    "relativeTime": "3 years, 4 months ago",
    "iso8601": "2016-02-11T06:47:18+00:00",
    "commitHash": "66be110f11",
    "author": "tradfor",
    "commitMessage": "BD CI structure changes"
  },
  "lastModified": {
    "relativeTime": "1 year, 9 months ago",
    "iso8601": "2017-09-25T10:53:27+05:30",
    "commitHash": "c419fc0991",
    "author": "Aswathy Sreelekha",
    "commitMessage": "Fix for set delivery zip code error issues"
  }
}
```

---

### `shallow|sh`

Writes `../processor-output/shallow.json` whose objects represents each JSP(F) and its first level of nested JSP(F)s (within Stores project).

#### `ShallowJSPObject` - `JSPObject` with `nested` property

```json
{
  "name": "PasswordResetNotification.jsp",
  "path": "/Users/kmedley/proj1085_ecommerce_web/WebCommerce/Stores/WebContent/WEB-INF/PasswordResetNotification.jsp",
  "depth": 0,
  "nested": [
    "/Users/kmedley/proj1085_ecommerce_web/WebCommerce/Stores/WebContent/include/JSTLEnvironmentSetup.jspf",
    "/Users/kmedley/proj1085_ecommerce_web/WebCommerce/Stores/WebContent/include/nocache.jspf",
    "/Users/kmedley/proj1085_ecommerce_web/WebCommerce/Stores/WebContent/WEB-INF/EmailHeader.jspf",
    "/Users/kmedley/proj1085_ecommerce_web/WebCommerce/Stores/WebContent/WEB-INF/EmailFooter.jspf",
    "/Users/kmedley/proj1085_ecommerce_web/WebCommerce/Stores/WebContent/companyGLOBALSAS/Snippets/Marketing/ESpot/EmailContentESpot.jsp"
  ]
}
```

---

### `deep|dp`

Writes `../processor-output/deep.json` whose input are shallow nested `JSPObjects`. The output is an array of deeply nested `JSPObjects`, whose nested paths have been replaced by objects representing their children, until we have no more nesting.

#### `DeepJSPObject` - `JSPObject` whose `nested` array has been resolved

```json
{
  "name": "AccountDetails_Data.jsp",
  "path": "/Users/kmedley/proj1085_ecommerce_web/WebCommerce/Stores/WebContent/companyGLOBALSAS/Body/Data/AccountDetails_Data.jsp",
  "depth": 0,
  "nested": [
    {
      "name": "MembershipNumberTooltipContent.jspf",
      "path": "/Users/kmedley/proj1085_ecommerce_web/WebCommerce/Stores/WebContent/companyGLOBALSAS/include/MembershipNumberTooltipContent.jspf",
      "depth": 1,
      "parent": "/Users/kmedley/proj1085_ecommerce_web/WebCommerce/Stores/WebContent/companyGLOBALSAS/Body/Data/AccountDetails_Data.jsp",
      "nested": []
    },
    {
      "name": "JSTLEnvironmentSetup.jspf",
      "path": "/Users/kmedley/proj1085_ecommerce_web/WebCommerce/Stores/WebContent/companyGLOBALSAS/include/JSTLEnvironmentSetup.jspf",
      "depth": 1,
      "parent": "/Users/kmedley/proj1085_ecommerce_web/WebCommerce/Stores/WebContent/companyGLOBALSAS/Body/Data/AccountDetails_Data.jsp",
      "nested": [
        {
          "name": "HeaderDateCalc.jspf",
          "path": "/Users/kmedley/proj1085_ecommerce_web/WebCommerce/Stores/WebContent/companyGLOBALSAS/Widgets/Header/HeaderDateCalc.jspf",
          "depth": 2,
          "parent": "/Users/kmedley/proj1085_ecommerce_web/WebCommerce/Stores/WebContent/companyGLOBALSAS/include/JSTLEnvironmentSetup.jspf",
          "nested": []
        }
      ]
    },
    {
      "name": "ErrorMessageSetup.jspf",
      "path": "/Users/kmedley/proj1085_ecommerce_web/WebCommerce/Stores/WebContent/companyGLOBALSAS/include/ErrorMessageSetup.jspf",
      "depth": 1,
      "parent": "/Users/kmedley/proj1085_ecommerce_web/WebCommerce/Stores/WebContent/companyGLOBALSAS/Body/Data/AccountDetails_Data.jsp",
      "nested": []
    },
    {
      "name": "MembershipNumberTooltipContent.jspf",
      "path": "/Users/kmedley/proj1085_ecommerce_web/WebCommerce/Stores/WebContent/companyGLOBALSAS/include/MembershipNumberTooltipContent.jspf",
      "depth": 1,
      "parent": "/Users/kmedley/proj1085_ecommerce_web/WebCommerce/Stores/WebContent/companyGLOBALSAS/Body/Data/AccountDetails_Data.jsp",
      "nested": []
    }
  ]
}
```

---

### `tiles|tls`

Writes `../processor-output/tiles.json`. Creates `TilesJSPObjects` to inform the client about attributes of each JSP (which tiles - def derived, is top level or nested, etc.).

#### `TilesJSPObject`

```json
{
  "tilesXML": "/Users/kmedley/proj1085_ecommerce_web/WebCommerce/Stores/WebContent/WEB-INF/tiles-defs-myaccount.xml",
  "path": "/Users/kmedley/proj1085_ecommerce_web/WebCommerce/Stores/WebContent/companyGLOBALSAS/Body/AccountAddressBookBody.jsp",
  "rootAncestor": "/Users/kmedley/proj1085_ecommerce_web/WebCommerce/Stores/WebContent/companyGLOBALSAS/Body/AccountAddressBookBody.jsp",
  "rootExtendsDefinition": "companyGLOBALSAS.accountLayout",
  "rootDefinitionName": "companyGLOBALSAS.accountAddressBook"
}
```

---

### `struts|str`

Writes `../processor-output/struts.json`. Creates `StrutsJSPObjects` to inform the client about attributes of each JSP (which struts XML, forward name, forward path its associated with).

#### `StrutsJSPObject`

```json
{
  "strutsXML": "/Users/kmedley/proj1085_ecommerce_web/WebCommerce/Stores/WebContent/WEB-INF/struts-config-company-rwd.xml",
  "forwardName": "AccountInformationDesktopView/10851",
  "forwardPath": "/Users/kmedley/proj1085_ecommerce_web/WebCommerce/Stores/WebContent/companyGLOBALSAS/UserArea/MembershipSection/AccountInformationHome.jsp",
  "path": "/Users/kmedley/proj1085_ecommerce_web/WebCommerce/Stores/WebContent/companyGLOBALSAS/UserArea/MembershipSection/AccountInformationHome.jsp",
  "deviceTypeId": "BROWSER",
  "storeDir": "companyGLOBALSAS"
}
```

---

### `response|rsp`

Writes `../processor-output/response-objects.json`. Takes `StrutsJSPObjects` and tests whether or not a particular forward name returns a non-404 response against a configurable set of domains.

#### `ResponseObject`

```json
{
  "forwardName": "AccountInformationDesktopView/10851",
  "responses": [
    {
      "domain": "https://www.company.com/AccountInformationDesktopView",
      "responseStatusCode": 302
    },
    {
      "domain": "https://www-vqa2.company.com/AccountInformationDesktopView",
      "responseStatusCode": 302
    }
  ]
}
```

---

### `merge-all|ma [options]`

Writes `../processor-output/merged-jsp-objects.json`. Merges a `RawJSPFileObject` with its `TilesJSPObject`, `StrutsJSPObject`, `GitJSPObject`, and `ResponseObject` compliments, given they exist.

#### [options]

##### `-no-git`, `--no-git`

Exclude fetching git logs for each JSP(F).

##### `-no-requests`, `--no-requests`

Exclude fetching HTTP responses of struts forward names.

##### `--sheets`

Update a spreadsheet derived from `merged-jsp-objects`.

##### `--report`

Create a reports.json (or add to an existing `reports.json`) representing metadata from this command.

##### `--clear-report`

Clears previously aggregated reports, starting fresh with this run.

#### `MergedJSPObject`

```json
{
  "points": 5,
  "_size": 580,
  "size": "580 B",
  "name": "AkamaiCacheIgnore.jspf",
  "root": "/Users/kmedley/proj1085_ecommerce_web/WebCommerce/Stores/WebContent",
  "filePath": "/Users/kmedley/proj1085_ecommerce_web/WebCommerce/Stores/WebContent/AkamaiCacheIgnore.jspf",
  "tilesJSPObject": {
    "tilesXML": "/Users/kmedley/proj1085_ecommerce_web/WebCommerce/Stores/WebContent/WEB-INF/tiles-defs.xml",
    "path": "/Users/kmedley/proj1085_ecommerce_web/WebCommerce/Stores/WebContent/AkamaiCacheIgnore.jspf",
    "parent": "/Users/kmedley/proj1085_ecommerce_web/WebCommerce/Stores/WebContent/companyGLOBALSAS/layouts/ErrorLayout.jsp",
    "rootAncestor": "/Users/kmedley/proj1085_ecommerce_web/WebCommerce/Stores/WebContent/companyGLOBALSAS/layouts/ErrorLayout.jsp",
    "rootDefinitionName": "companyGLOBALSAS.errorLayout"
  },
  "strutsJSPObject": {
    "strutsXML": "/Users/kmedley/proj1085_ecommerce_web/WebCommerce/Stores/WebContent/WEB-INF/struts-config-company-rwd.xml",
    "forwardName": "stateprov.json/10851",
    "forwardPath": "/Users/kmedley/proj1085_ecommerce_web/WebCommerce/Stores/WebContent/companyGLOBALSAS/RWD/json/dynamicStateProv.jsp",
    "path": "/Users/kmedley/proj1085_ecommerce_web/WebCommerce/Stores/WebContent/AkamaiCacheIgnore.jspf",
    "deviceTypeId": "BROWSER",
    "storeDir": "companyGLOBALSAS",
    "parent": "/Users/kmedley/proj1085_ecommerce_web/WebCommerce/Stores/WebContent/companyGLOBALSAS/RWD/json/dynamicStateProv.jsp"
  },
  "gitJSPObject": {
    "filePath": "/Users/kmedley/proj1085_ecommerce_web/WebCommerce/Stores/WebContent/AkamaiCacheIgnore.jspf",
    "created": {
      "relativeTime": "3 years, 4 months ago",
      "iso8601": "2016-02-11T06:47:18+00:00",
      "commitHash": "66be110f11",
      "author": "tradfor",
      "commitMessage": "BD CI structure changes"
    },
    "lastModified": {
      "relativeTime": "3 years ago",
      "iso8601": "2016-06-10T22:54:38+00:00",
      "commitHash": "e7944d7ac0",
      "author": "pchaudhari",
      "commitMessage": "Added errorlayout to fix response header status issue."
    }
  },
  "responseObject": {
    "forwardName": "stateprov.json/10851",
    "responses": [
      {
        "domain": "https://www.company.com/stateprov.json",
        "responseStatusCode": 200
      },
      {
        "domain": "https://www-vqa2.company.com/stateprov.json",
        "responseStatusCode": 200
      }
    ]
  }
}
```

---

### `sheets`

Updates a specified Google spreadsheet with metadata for each JSP. Requires `merged-jsp-object.json` (jsp merge-all).

---

### `remove [options]`

Removes JSPs from version control based on low point value. Requires `merged-jsp-object.json` (jsp merge-all).

#### [options]

##### `--audit`

Will not remove anything. Just writes audited-objects.json to be reviewed before removing.

##### `--staging-scriptlet`

Takes the curated list of JSP(F)s ready for removal and appends a hardcoded scriptlet to it to allow Splunk to
gather any JSP(F)s that were wrongly idenfitied as unused by JSP Insights CLI tool.

##### `--remove-staging-scriptlet`

Removes the scriptlet tag appended to the curated list of JSP(F)s ready for removal.

## Generate Documentation

```bash
cd path/to/jsp-insights && npm run docs
```

## Common Use Cases
