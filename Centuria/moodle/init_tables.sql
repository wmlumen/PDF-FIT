CREATE TABLE mdl_sessions (
id BIGINT(10) NOT NULL auto_increment,
state BIGINT(10) NOT NULL DEFAULT 0,
sid VARCHAR(128) COLLATE utf8mb4_general_ci NOT NULL DEFAULT '',
userid BIGINT(10) NOT NULL,
sessdata LONGTEXT COLLATE utf8mb4_general_ci,
timecreated BIGINT(10) NOT NULL,
timemodified BIGINT(10) NOT NULL,
firstip VARCHAR(45) COLLATE utf8mb4_general_ci,
lastip VARCHAR(45) COLLATE utf8mb4_general_ci,
CONSTRAINT PRIMARY KEY (id)
, KEY mdl_sess_sta_ix (state)
, UNIQUE KEY mdl_sess_sid_uix (sid)
, KEY mdl_sess_tim_ix (timecreated)
, KEY mdl_sess_tim2_ix (timemodified)
, KEY mdl_sess_use_ix (userid)
)
ENGINE = InnoDB
DEFAULT COLLATE = utf8mb4_general_ci ROW_FORMAT=Compressed
COMMENT='Database based session storage - now recommended'
;

CREATE TABLE mdl_user (
id BIGINT(10) NOT NULL auto_increment,
auth VARCHAR(20) COLLATE utf8mb4_general_ci NOT NULL DEFAULT 'manual',
confirmed TINYINT(1) NOT NULL DEFAULT 0,
policyagreed TINYINT(1) NOT NULL DEFAULT 0,
deleted TINYINT(1) NOT NULL DEFAULT 0,
suspended TINYINT(1) NOT NULL DEFAULT 0,
mnethostid BIGINT(10) NOT NULL DEFAULT 0,
username VARCHAR(100) COLLATE utf8mb4_general_ci NOT NULL DEFAULT '',
password VARCHAR(255) COLLATE utf8mb4_general_ci NOT NULL DEFAULT '',
idnumber VARCHAR(255) COLLATE utf8mb4_general_ci NOT NULL DEFAULT '',
firstname VARCHAR(100) COLLATE utf8mb4_general_ci NOT NULL DEFAULT '',
lastname VARCHAR(100) COLLATE utf8mb4_general_ci NOT NULL DEFAULT '',
email VARCHAR(100) COLLATE utf8mb4_general_ci NOT NULL DEFAULT '',
emailstop TINYINT(1) NOT NULL DEFAULT 0,
phone1 VARCHAR(20) COLLATE utf8mb4_general_ci NOT NULL DEFAULT '',
phone2 VARCHAR(20) COLLATE utf8mb4_general_ci NOT NULL DEFAULT '',
institution VARCHAR(255) COLLATE utf8mb4_general_ci NOT NULL DEFAULT '',
department VARCHAR(255) COLLATE utf8mb4_general_ci NOT NULL DEFAULT '',
address VARCHAR(255) COLLATE utf8mb4_general_ci NOT NULL DEFAULT '',
city VARCHAR(120) COLLATE utf8mb4_general_ci NOT NULL DEFAULT '',
country VARCHAR(2) COLLATE utf8mb4_general_ci NOT NULL DEFAULT '',
lang VARCHAR(30) COLLATE utf8mb4_general_ci NOT NULL DEFAULT 'en',
calendartype VARCHAR(30) COLLATE utf8mb4_general_ci NOT NULL DEFAULT 'gregorian',
theme VARCHAR(50) COLLATE utf8mb4_general_ci NOT NULL DEFAULT '',
timezone VARCHAR(100) COLLATE utf8mb4_general_ci NOT NULL DEFAULT '99',
firstaccess BIGINT(10) NOT NULL DEFAULT 0,
lastaccess BIGINT(10) NOT NULL DEFAULT 0,
lastlogin BIGINT(10) NOT NULL DEFAULT 0,
currentlogin BIGINT(10) NOT NULL DEFAULT 0,
lastip VARCHAR(45) COLLATE utf8mb4_general_ci NOT NULL DEFAULT '',
secret VARCHAR(15) COLLATE utf8mb4_general_ci NOT NULL DEFAULT '',
picture BIGINT(10) NOT NULL DEFAULT 0,
description LONGTEXT COLLATE utf8mb4_general_ci,
descriptionformat TINYINT(2) NOT NULL DEFAULT 1,
mailformat TINYINT(1) NOT NULL DEFAULT 1,
maildigest TINYINT(1) NOT NULL DEFAULT 0,
maildisplay TINYINT(2) NOT NULL DEFAULT 2,
autosubscribe TINYINT(1) NOT NULL DEFAULT 1,
trackforums TINYINT(1) NOT NULL DEFAULT 0,
timecreated BIGINT(10) NOT NULL DEFAULT 0,
timemodified BIGINT(10) NOT NULL DEFAULT 0,
trustbitmask BIGINT(10) NOT NULL DEFAULT 0,
imagealt VARCHAR(255) COLLATE utf8mb4_general_ci,
lastnamephonetic VARCHAR(255) COLLATE utf8mb4_general_ci,
firstnamephonetic VARCHAR(255) COLLATE utf8mb4_general_ci,
middlename VARCHAR(255) COLLATE utf8mb4_general_ci,
alternatename VARCHAR(255) COLLATE utf8mb4_general_ci,
CONSTRAINT PRIMARY KEY (id)
, UNIQUE KEY mdl_user_mneuse_uix (mnethostid, username)
, KEY mdl_user_del_ix (deleted)
, KEY mdl_user_con_ix (confirmed)
, KEY mdl_user_fir_ix (firstname)
, KEY mdl_user_las_ix (lastname)
, KEY mdl_user_cit_ix (city)
, KEY mdl_user_cou_ix (country)
, KEY mdl_user_las2_ix (lastaccess)
, KEY mdl_user_ema_ix (email)
, KEY mdl_user_aut_ix (auth)
, KEY mdl_user_idn_ix (idnumber)
, KEY mdl_user_fir2_ix (firstnamephonetic)
, KEY mdl_user_las3_ix (lastnamephonetic)
, KEY mdl_user_mid_ix (middlename)
, KEY mdl_user_alt_ix (alternatename)
)
ENGINE = InnoDB
DEFAULT COLLATE = utf8mb4_general_ci ROW_FORMAT=Compressed
COMMENT='One record for each person'
;

CREATE TABLE mdl_user_preferences (
id BIGINT(10) NOT NULL auto_increment,
userid BIGINT(10) NOT NULL DEFAULT 0,
name VARCHAR(255) COLLATE utf8mb4_general_ci NOT NULL DEFAULT '',
value LONGTEXT COLLATE utf8mb4_general_ci NOT NULL,
CONSTRAINT PRIMARY KEY (id)
, UNIQUE KEY mdl_userpref_usenam_uix (userid, name)
, KEY mdl_userpref_nam_ix (name)
)
ENGINE = InnoDB
DEFAULT COLLATE = utf8mb4_general_ci ROW_FORMAT=Compressed
COMMENT='Allows modules to store arbitrary user preferences'
;

CREATE TABLE mdl_user_lastaccess (
id BIGINT(10) NOT NULL auto_increment,
userid BIGINT(10) NOT NULL DEFAULT 0,
courseid BIGINT(10) NOT NULL DEFAULT 0,
timeaccess BIGINT(10) NOT NULL DEFAULT 0,
CONSTRAINT PRIMARY KEY (id)
, UNIQUE KEY mdl_userlast_usecou_uix (userid, courseid)
, KEY mdl_userlast_use_ix (userid)
, KEY mdl_userlast_cou_ix (courseid)
)
ENGINE = InnoDB
DEFAULT COLLATE = utf8mb4_general_ci ROW_FORMAT=Compressed
COMMENT='To keep track of course page access times, used in online pa'
;

CREATE TABLE mdl_user_password_history (
id BIGINT(10) NOT NULL auto_increment,
userid BIGINT(10) NOT NULL,
hash VARCHAR(255) COLLATE utf8mb4_general_ci NOT NULL DEFAULT '',
timecreated BIGINT(10) NOT NULL,
CONSTRAINT PRIMARY KEY (id)
, KEY mdl_userpasshist_use_ix (userid)
)
ENGINE = InnoDB
DEFAULT COLLATE = utf8mb4_general_ci ROW_FORMAT=Compressed
COMMENT='A rotating log of hashes of previously used passwords for ea'
;

CREATE TABLE mdl_scale (
id BIGINT(10) NOT NULL auto_increment,
courseid BIGINT(10) NOT NULL DEFAULT 0,
userid BIGINT(10) NOT NULL DEFAULT 0,
name VARCHAR(255) COLLATE utf8mb4_general_ci NOT NULL DEFAULT '',
scale LONGTEXT COLLATE utf8mb4_general_ci NOT NULL,
description LONGTEXT COLLATE utf8mb4_general_ci NOT NULL,
descriptionformat TINYINT(2) NOT NULL DEFAULT 0,
timemodified BIGINT(10) NOT NULL DEFAULT 0,
CONSTRAINT PRIMARY KEY (id)
, KEY mdl_scal_cou_ix (courseid)
, KEY mdl_scal_use_ix (userid)
)
ENGINE = InnoDB
DEFAULT COLLATE = utf8mb4_general_ci ROW_FORMAT=Compressed
COMMENT='Defines grading scales'
;

CREATE TABLE mdl_scale_history (
id BIGINT(10) NOT NULL auto_increment,
action BIGINT(10) NOT NULL DEFAULT 0,
oldid BIGINT(10) NOT NULL,
source VARCHAR(255) COLLATE utf8mb4_general_ci,
timemodified BIGINT(10),
loggeduser BIGINT(10),
courseid BIGINT(10) NOT NULL DEFAULT 0,
userid BIGINT(10) NOT NULL DEFAULT 0,
name VARCHAR(255) COLLATE utf8mb4_general_ci NOT NULL DEFAULT '',
scale LONGTEXT COLLATE utf8mb4_general_ci NOT NULL,
description LONGTEXT COLLATE utf8mb4_general_ci NOT NULL,
CONSTRAINT PRIMARY KEY (id)
, KEY mdl_scalhist_act_ix (action)
, KEY mdl_scalhist_tim_ix (timemodified)
, KEY mdl_scalhist_old_ix (oldid)
, KEY mdl_scalhist_cou_ix (courseid)
, KEY mdl_scalhist_log_ix (loggeduser)
, KEY mdl_scalhist_use_ix (userid)
)
ENGINE = InnoDB
DEFAULT COLLATE = utf8mb4_general_ci ROW_FORMAT=Compressed
COMMENT='History table'
;

CREATE TABLE mdl_stats_daily (
id BIGINT(10) NOT NULL auto_increment,
courseid BIGINT(10) NOT NULL DEFAULT 0,
timeend BIGINT(10) NOT NULL DEFAULT 0,
roleid BIGINT(10) NOT NULL DEFAULT 0,
stattype VARCHAR(20) COLLATE utf8mb4_general_ci NOT NULL DEFAULT 'activity',
stat1 BIGINT(10) NOT NULL DEFAULT 0,
stat2 BIGINT(10) NOT NULL DEFAULT 0,
CONSTRAINT PRIMARY KEY (id)
, KEY mdl_statdail_cou_ix (courseid)
, KEY mdl_statdail_tim_ix (timeend)
, KEY mdl_statdail_rol_ix (roleid)
)
ENGINE = InnoDB
DEFAULT COLLATE = utf8mb4_general_ci ROW_FORMAT=Compressed
COMMENT='to accumulate daily stats'
;

CREATE TABLE mdl_stats_weekly (
id BIGINT(10) NOT NULL auto_increment,
courseid BIGINT(10) NOT NULL DEFAULT 0,
timeend BIGINT(10) NOT NULL DEFAULT 0,
roleid BIGINT(10) NOT NULL DEFAULT 0,
stattype VARCHAR(20) COLLATE utf8mb4_general_ci NOT NULL DEFAULT 'activity',
stat1 BIGINT(10) NOT NULL DEFAULT 0,
stat2 BIGINT(10) NOT NULL DEFAULT 0,
CONSTRAINT PRIMARY KEY (id)
, KEY mdl_statweek_cou_ix (courseid)
, KEY mdl_statweek_tim_ix (timeend)
, KEY mdl_statweek_rol_ix (roleid)
)
ENGINE = InnoDB
DEFAULT COLLATE = utf8mb4_general_ci ROW_FORMAT=Compressed
COMMENT='To accumulate weekly stats'
;

CREATE TABLE mdl_stats_monthly (
id BIGINT(10) NOT NULL auto_increment,
courseid BIGINT(10) NOT NULL DEFAULT 0,
timeend BIGINT(10) NOT NULL DEFAULT 0,
roleid BIGINT(10) NOT NULL DEFAULT 0,
stattype VARCHAR(20) COLLATE utf8mb4_general_ci NOT NULL DEFAULT 'activity',
stat1 BIGINT(10) NOT NULL DEFAULT 0,
stat2 BIGINT(10) NOT NULL DEFAULT 0,
CONSTRAINT PRIMARY KEY (id)
, KEY mdl_statmont_cou_ix (courseid)
, KEY mdl_statmont_tim_ix (timeend)
, KEY mdl_statmont_rol_ix (roleid)
)
ENGINE = InnoDB
DEFAULT COLLATE = utf8mb4_general_ci ROW_FORMAT=Compressed
COMMENT='To accumulate monthly stats'
;

CREATE TABLE mdl_stats_user_daily (
id BIGINT(10) NOT NULL auto_increment,
courseid BIGINT(10) NOT NULL DEFAULT 0,
userid BIGINT(10) NOT NULL DEFAULT 0,
roleid BIGINT(10) NOT NULL DEFAULT 0,
timeend BIGINT(10) NOT NULL DEFAULT 0,
statsreads BIGINT(10) NOT NULL DEFAULT 0,
statswrites BIGINT(10) NOT NULL DEFAULT 0,
stattype VARCHAR(30) COLLATE utf8mb4_general_ci NOT NULL DEFAULT '',
CONSTRAINT PRIMARY KEY (id)
, KEY mdl_statuserdail_cou_ix (courseid)
, KEY mdl_statuserdail_use_ix (userid)
, KEY mdl_statuserdail_rol_ix (roleid)
, KEY mdl_statuserdail_tim_ix (timeend)
)
ENGINE = InnoDB
DEFAULT COLLATE = utf8mb4_general_ci ROW_FORMAT=Compressed
COMMENT='To accumulate daily stats per course/user'
;

CREATE TABLE mdl_stats_user_weekly (
id BIGINT(10) NOT NULL auto_increment,
courseid BIGINT(10) NOT NULL DEFAULT 0,
userid BIGINT(10) NOT NULL DEFAULT 0,
roleid BIGINT(10) NOT NULL DEFAULT 0,
timeend BIGINT(10) NOT NULL DEFAULT 0,
statsreads BIGINT(10) NOT NULL DEFAULT 0,
statswrites BIGINT(10) NOT NULL DEFAULT 0,
stattype VARCHAR(30) COLLATE utf8mb4_general_ci NOT NULL DEFAULT '',
CONSTRAINT PRIMARY KEY (id)
, KEY mdl_statuserweek_cou_ix (courseid)
, KEY mdl_statuserweek_use_ix (userid)
, KEY mdl_statuserweek_rol_ix (roleid)
, KEY mdl_statuserweek_tim_ix (timeend)
)
ENGINE = InnoDB
DEFAULT COLLATE = utf8mb4_general_ci ROW_FORMAT=Compressed
COMMENT='To accumulate weekly stats per course/user'
;

CREATE TABLE mdl_stats_user_monthly (
id BIGINT(10) NOT NULL auto_increment,
courseid BIGINT(10) NOT NULL DEFAULT 0,
userid BIGINT(10) NOT NULL DEFAULT 0,
roleid BIGINT(10) NOT NULL DEFAULT 0,
timeend BIGINT(10) NOT NULL DEFAULT 0,
statsreads BIGINT(10) NOT NULL DEFAULT 0,
statswrites BIGINT(10) NOT NULL DEFAULT 0,
stattype VARCHAR(30) COLLATE utf8mb4_general_ci NOT NULL DEFAULT '',
CONSTRAINT PRIMARY KEY (id)
, KEY mdl_statusermont_cou_ix (courseid)
, KEY mdl_statusermont_use_ix (userid)
, KEY mdl_statusermont_rol_ix (roleid)
, KEY mdl_statusermont_tim_ix (timeend)
)
ENGINE = InnoDB
DEFAULT COLLATE = utf8mb4_general_ci ROW_FORMAT=Compressed
COMMENT='To accumulate monthly stats per course/user'
;

CREATE TABLE mdl_post (
id BIGINT(10) NOT NULL auto_increment,
module VARCHAR(20) COLLATE utf8mb4_general_ci NOT NULL DEFAULT '',
userid BIGINT(10) NOT NULL DEFAULT 0,
courseid BIGINT(10) NOT NULL DEFAULT 0,
groupid BIGINT(10) NOT NULL DEFAULT 0,
moduleid BIGINT(10) NOT NULL DEFAULT 0,
coursemoduleid BIGINT(10) NOT NULL DEFAULT 0,
subject VARCHAR(128) COLLATE utf8mb4_general_ci NOT NULL DEFAULT '',
summary LONGTEXT COLLATE utf8mb4_general_ci,
content LONGTEXT COLLATE utf8mb4_general_ci,
uniquehash VARCHAR(255) COLLATE utf8mb4_general_ci NOT NULL DEFAULT '',
rating BIGINT(10) NOT NULL DEFAULT 0,
format BIGINT(10) NOT NULL DEFAULT 0,
summaryformat TINYINT(2) NOT NULL DEFAULT 0,
attachment VARCHAR(100) COLLATE utf8mb4_general_ci,
publishstate VARCHAR(20) COLLATE utf8mb4_general_ci NOT NULL DEFAULT 'draft',
lastmodified BIGINT(10) NOT NULL DEFAULT 0,
created BIGINT(10) NOT NULL DEFAULT 0,
usermodified BIGINT(10),
CONSTRAINT PRIMARY KEY (id)
, UNIQUE KEY mdl_post_iduse_uix (id, userid)
, KEY mdl_post_las_ix (lastmodified)
, KEY mdl_post_mod_ix (module)
, KEY mdl_post_sub_ix (subject)
, KEY mdl_post_use_ix (usermodified)
, KEY mdl_post_cou_ix (courseid)
, KEY mdl_post_cou2_ix (coursemoduleid)
)
ENGINE = InnoDB
DEFAULT COLLATE = utf8mb4_general_ci ROW_FORMAT=Compressed
COMMENT='Generic post table to hold data blog entries etc in differen'
;

CREATE TABLE mdl_role (
id BIGINT(10) NOT NULL auto_increment,
name VARCHAR(255) COLLATE utf8mb4_general_ci NOT NULL DEFAULT '',
shortname VARCHAR(100) COLLATE utf8mb4_general_ci NOT NULL DEFAULT '',
description LONGTEXT COLLATE utf8mb4_general_ci NOT NULL,
sortorder BIGINT(10) NOT NULL DEFAULT 0,
archetype VARCHAR(30) COLLATE utf8mb4_general_ci NOT NULL DEFAULT '',
CONSTRAINT PRIMARY KEY (id)
, UNIQUE KEY mdl_role_sor_uix (sortorder)
, UNIQUE KEY mdl_role_sho_uix (shortname)
)
ENGINE = InnoDB
DEFAULT COLLATE = utf8mb4_general_ci ROW_FORMAT=Compressed
COMMENT='moodle roles'
;

CREATE TABLE mdl_context (
id BIGINT(10) NOT NULL auto_increment,
contextlevel BIGINT(10) NOT NULL DEFAULT 0,
instanceid BIGINT(10) NOT NULL DEFAULT 0,
path VARCHAR(255) COLLATE utf8mb4_general_ci,
depth TINYINT(2) NOT NULL DEFAULT 0,
locked TINYINT(2) NOT NULL DEFAULT 0,
CONSTRAINT PRIMARY KEY (id)
, UNIQUE KEY mdl_cont_conins_uix (contextlevel, instanceid)
, KEY mdl_cont_ins_ix (instanceid)
, KEY mdl_cont_pat_ix (path)
)
ENGINE = InnoDB
DEFAULT COLLATE = utf8mb4_general_ci ROW_FORMAT=Compressed
COMMENT='one of these must be set'
;

CREATE TABLE mdl_context_temp (
id BIGINT(10) NOT NULL,
path VARCHAR(255) COLLATE utf8mb4_general_ci NOT NULL DEFAULT '',
depth TINYINT(2) NOT NULL,
locked TINYINT(2) NOT NULL DEFAULT 0,
CONSTRAINT PRIMARY KEY (id)
)
ENGINE = InnoDB
DEFAULT COLLATE = utf8mb4_general_ci ROW_FORMAT=Compressed
COMMENT='Used by build_context_path() in upgrade and cron to keep con'
;

CREATE TABLE mdl_capabilities (
id BIGINT(10) NOT NULL auto_increment,
name VARCHAR(255) COLLATE utf8mb4_general_ci NOT NULL DEFAULT '',
captype VARCHAR(50) COLLATE utf8mb4_general_ci NOT NULL DEFAULT '',
contextlevel BIGINT(10) NOT NULL DEFAULT 0,
component VARCHAR(100) COLLATE utf8mb4_general_ci NOT NULL DEFAULT '',
riskbitmask BIGINT(10) NOT NULL DEFAULT 0,
CONSTRAINT PRIMARY KEY (id)
, UNIQUE KEY mdl_capa_nam_uix (name)
)
ENGINE = InnoDB
DEFAULT COLLATE = utf8mb4_general_ci ROW_FORMAT=Compressed
COMMENT='this defines all capabilities'
;

CREATE TABLE mdl_role_allow_assign (
id BIGINT(10) NOT NULL auto_increment,
roleid BIGINT(10) NOT NULL DEFAULT 0,
allowassign BIGINT(10) NOT NULL DEFAULT 0,
CONSTRAINT PRIMARY KEY (id)
, UNIQUE KEY mdl_rolealloassi_rolall_uix (roleid, allowassign)
, KEY mdl_rolealloassi_rol_ix (roleid)
, KEY mdl_rolealloassi_all_ix (allowassign)
)
ENGINE = InnoDB
DEFAULT COLLATE = utf8mb4_general_ci ROW_FORMAT=Compressed
COMMENT='this defines what role can assign what role'
;

CREATE TABLE mdl_role_allow_override (
id BIGINT(10) NOT NULL auto_increment,
roleid BIGINT(10) NOT NULL DEFAULT 0,
allowoverride BIGINT(10) NOT NULL DEFAULT 0,
CONSTRAINT PRIMARY KEY (id)
, UNIQUE KEY mdl_rolealloover_rolall_uix (roleid, allowoverride)
, KEY mdl_rolealloover_rol_ix (roleid)
, KEY mdl_rolealloover_all_ix (allowoverride)
)
ENGINE = InnoDB
DEFAULT COLLATE = utf8mb4_general_ci ROW_FORMAT=Compressed
COMMENT='this defines what role can assign what role'
;
