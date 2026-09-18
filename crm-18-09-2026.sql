--
-- PostgreSQL database dump
--

\restrict qOvbgc9GfSr2ZJIypeEfDQ75wYUH7jfJ9KBJER8Eb6nlnZIrMMMKh4VgVdHbm4T

-- Dumped from database version 17.9
-- Dumped by pg_dump version 18.4

-- Started on 2026-09-18 10:17:23

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET transaction_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;

--
-- TOC entry 2 (class 3079 OID 36584)
-- Name: pgcrypto; Type: EXTENSION; Schema: -; Owner: -
--

CREATE EXTENSION IF NOT EXISTS pgcrypto WITH SCHEMA public;


--
-- TOC entry 5725 (class 0 OID 0)
-- Dependencies: 2
-- Name: EXTENSION pgcrypto; Type: COMMENT; Schema: -; Owner: 
--

COMMENT ON EXTENSION pgcrypto IS 'cryptographic functions';


SET default_tablespace = '';

SET default_table_access_method = heap;

--
-- TOC entry 265 (class 1259 OID 37051)
-- Name: activities; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.activities (
    id integer NOT NULL,
    title character varying(255) DEFAULT NULL::character varying,
    type character varying(255) NOT NULL,
    comment text,
    additional jsonb,
    schedule_from timestamp with time zone,
    schedule_to timestamp with time zone,
    is_done boolean DEFAULT false NOT NULL,
    user_id integer,
    created_at timestamp with time zone,
    updated_at timestamp with time zone,
    location character varying(255) DEFAULT NULL::character varying
);


ALTER TABLE public.activities OWNER TO postgres;

--
-- TOC entry 264 (class 1259 OID 37050)
-- Name: activities_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.activities_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.activities_id_seq OWNER TO postgres;

--
-- TOC entry 5726 (class 0 OID 0)
-- Dependencies: 264
-- Name: activities_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.activities_id_seq OWNED BY public.activities.id;


--
-- TOC entry 267 (class 1259 OID 37069)
-- Name: activity_files; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.activity_files (
    id integer NOT NULL,
    name character varying(255) NOT NULL,
    path character varying(255) NOT NULL,
    activity_id integer NOT NULL,
    created_at timestamp with time zone,
    updated_at timestamp with time zone
);


ALTER TABLE public.activity_files OWNER TO postgres;

--
-- TOC entry 266 (class 1259 OID 37068)
-- Name: activity_files_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.activity_files_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.activity_files_id_seq OWNER TO postgres;

--
-- TOC entry 5727 (class 0 OID 0)
-- Dependencies: 266
-- Name: activity_files_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.activity_files_id_seq OWNED BY public.activity_files.id;


--
-- TOC entry 269 (class 1259 OID 37084)
-- Name: activity_participants; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.activity_participants (
    id integer NOT NULL,
    activity_id integer NOT NULL,
    user_id integer,
    person_id integer
);


ALTER TABLE public.activity_participants OWNER TO postgres;

--
-- TOC entry 268 (class 1259 OID 37083)
-- Name: activity_participants_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.activity_participants_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.activity_participants_id_seq OWNER TO postgres;

--
-- TOC entry 5728 (class 0 OID 0)
-- Dependencies: 268
-- Name: activity_participants_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.activity_participants_id_seq OWNED BY public.activity_participants.id;


--
-- TOC entry 239 (class 1259 OID 36792)
-- Name: attribute_options; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.attribute_options (
    id integer NOT NULL,
    name character varying(255) DEFAULT NULL::character varying,
    sort_order integer,
    attribute_id integer NOT NULL
);


ALTER TABLE public.attribute_options OWNER TO postgres;

--
-- TOC entry 238 (class 1259 OID 36791)
-- Name: attribute_options_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.attribute_options_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.attribute_options_id_seq OWNER TO postgres;

--
-- TOC entry 5729 (class 0 OID 0)
-- Dependencies: 238
-- Name: attribute_options_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.attribute_options_id_seq OWNED BY public.attribute_options.id;


--
-- TOC entry 241 (class 1259 OID 36806)
-- Name: attribute_values; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.attribute_values (
    id integer NOT NULL,
    entity_type character varying(255) DEFAULT 'leads'::character varying NOT NULL,
    text_value text,
    boolean_value boolean,
    integer_value integer,
    float_value double precision,
    datetime_value timestamp with time zone,
    date_value date,
    "json_value" jsonb,
    entity_id integer NOT NULL,
    attribute_id integer NOT NULL,
    unique_id character varying(255) DEFAULT NULL::character varying
);


ALTER TABLE public.attribute_values OWNER TO postgres;

--
-- TOC entry 240 (class 1259 OID 36805)
-- Name: attribute_values_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.attribute_values_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.attribute_values_id_seq OWNER TO postgres;

--
-- TOC entry 5730 (class 0 OID 0)
-- Dependencies: 240
-- Name: attribute_values_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.attribute_values_id_seq OWNED BY public.attribute_values.id;


--
-- TOC entry 237 (class 1259 OID 36775)
-- Name: attributes; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.attributes (
    id integer NOT NULL,
    code character varying(255) NOT NULL,
    name character varying(255) NOT NULL,
    type character varying(255) NOT NULL,
    lookup_type character varying(255) DEFAULT NULL::character varying,
    entity_type character varying(255) NOT NULL,
    sort_order integer,
    validation character varying(255) DEFAULT NULL::character varying,
    is_required boolean DEFAULT false NOT NULL,
    is_unique boolean DEFAULT false NOT NULL,
    quick_add boolean DEFAULT false NOT NULL,
    is_user_defined boolean DEFAULT true NOT NULL,
    created_at timestamp with time zone,
    updated_at timestamp with time zone
);


ALTER TABLE public.attributes OWNER TO postgres;

--
-- TOC entry 236 (class 1259 OID 36774)
-- Name: attributes_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.attributes_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.attributes_id_seq OWNER TO postgres;

--
-- TOC entry 5731 (class 0 OID 0)
-- Dependencies: 236
-- Name: attributes_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.attributes_id_seq OWNED BY public.attributes.id;


--
-- TOC entry 297 (class 1259 OID 37392)
-- Name: contact_export_batch_items; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.contact_export_batch_items (
    id bigint NOT NULL,
    batch_id bigint NOT NULL,
    person_id integer NOT NULL,
    status character varying(255) DEFAULT 'pending'::character varying NOT NULL,
    google_resource_name character varying(255) DEFAULT NULL::character varying,
    error_message text,
    created_at timestamp with time zone,
    updated_at timestamp with time zone
);


ALTER TABLE public.contact_export_batch_items OWNER TO postgres;

--
-- TOC entry 296 (class 1259 OID 37391)
-- Name: contact_export_batch_items_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.contact_export_batch_items_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.contact_export_batch_items_id_seq OWNER TO postgres;

--
-- TOC entry 5732 (class 0 OID 0)
-- Dependencies: 296
-- Name: contact_export_batch_items_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.contact_export_batch_items_id_seq OWNED BY public.contact_export_batch_items.id;


--
-- TOC entry 295 (class 1259 OID 37371)
-- Name: contact_export_batches; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.contact_export_batches (
    id bigint NOT NULL,
    user_id integer NOT NULL,
    state character varying(255) DEFAULT 'pending'::character varying NOT NULL,
    total_count integer DEFAULT 0 NOT NULL,
    exported_count integer DEFAULT 0 NOT NULL,
    duplicate_count integer DEFAULT 0 NOT NULL,
    failed_count integer DEFAULT 0 NOT NULL,
    error_file_path character varying(255) DEFAULT NULL::character varying,
    started_at timestamp with time zone,
    completed_at timestamp with time zone,
    created_at timestamp with time zone,
    updated_at timestamp with time zone
);


ALTER TABLE public.contact_export_batches OWNER TO postgres;

--
-- TOC entry 294 (class 1259 OID 37370)
-- Name: contact_export_batches_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.contact_export_batches_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.contact_export_batches_id_seq OWNER TO postgres;

--
-- TOC entry 5733 (class 0 OID 0)
-- Dependencies: 294
-- Name: contact_export_batches_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.contact_export_batches_id_seq OWNED BY public.contact_export_batches.id;


--
-- TOC entry 299 (class 1259 OID 37415)
-- Name: core_config; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.core_config (
    id integer NOT NULL,
    code character varying(255) NOT NULL,
    value text,
    created_at timestamp with time zone,
    updated_at timestamp with time zone
);


ALTER TABLE public.core_config OWNER TO postgres;

--
-- TOC entry 298 (class 1259 OID 37414)
-- Name: core_config_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.core_config_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.core_config_id_seq OWNER TO postgres;

--
-- TOC entry 5734 (class 0 OID 0)
-- Dependencies: 298
-- Name: core_config_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.core_config_id_seq OWNED BY public.core_config.id;


--
-- TOC entry 227 (class 1259 OID 36694)
-- Name: countries; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.countries (
    id integer NOT NULL,
    code character varying(255) NOT NULL,
    name character varying(255) NOT NULL
);


ALTER TABLE public.countries OWNER TO postgres;

--
-- TOC entry 226 (class 1259 OID 36693)
-- Name: countries_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.countries_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.countries_id_seq OWNER TO postgres;

--
-- TOC entry 5735 (class 0 OID 0)
-- Dependencies: 226
-- Name: countries_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.countries_id_seq OWNED BY public.countries.id;


--
-- TOC entry 229 (class 1259 OID 36703)
-- Name: country_states; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.country_states (
    id integer NOT NULL,
    country_code character varying(255) NOT NULL,
    code character varying(255) NOT NULL,
    name character varying(255) NOT NULL,
    country_id integer NOT NULL
);


ALTER TABLE public.country_states OWNER TO postgres;

--
-- TOC entry 228 (class 1259 OID 36702)
-- Name: country_states_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.country_states_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.country_states_id_seq OWNER TO postgres;

--
-- TOC entry 5736 (class 0 OID 0)
-- Dependencies: 228
-- Name: country_states_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.country_states_id_seq OWNED BY public.country_states.id;


--
-- TOC entry 301 (class 1259 OID 37424)
-- Name: datagrid_saved_filters; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.datagrid_saved_filters (
    id bigint NOT NULL,
    user_id integer NOT NULL,
    name character varying(255) NOT NULL,
    src character varying(255) NOT NULL,
    applied jsonb NOT NULL,
    created_at timestamp with time zone,
    updated_at timestamp with time zone
);


ALTER TABLE public.datagrid_saved_filters OWNER TO postgres;

--
-- TOC entry 300 (class 1259 OID 37423)
-- Name: datagrid_saved_filters_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.datagrid_saved_filters_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.datagrid_saved_filters_id_seq OWNER TO postgres;

--
-- TOC entry 5737 (class 0 OID 0)
-- Dependencies: 300
-- Name: datagrid_saved_filters_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.datagrid_saved_filters_id_seq OWNED BY public.datagrid_saved_filters.id;


--
-- TOC entry 288 (class 1259 OID 37310)
-- Name: email_attachments; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.email_attachments (
    id integer NOT NULL,
    name character varying(255) DEFAULT NULL::character varying,
    path character varying(255) NOT NULL,
    size integer,
    content_type character varying(255) DEFAULT NULL::character varying,
    content_id character varying(255) DEFAULT NULL::character varying,
    email_id integer NOT NULL,
    created_at timestamp with time zone,
    updated_at timestamp with time zone
);


ALTER TABLE public.email_attachments OWNER TO postgres;

--
-- TOC entry 287 (class 1259 OID 37309)
-- Name: email_attachments_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.email_attachments_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.email_attachments_id_seq OWNER TO postgres;

--
-- TOC entry 5738 (class 0 OID 0)
-- Dependencies: 287
-- Name: email_attachments_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.email_attachments_id_seq OWNED BY public.email_attachments.id;


--
-- TOC entry 289 (class 1259 OID 37327)
-- Name: email_tags; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.email_tags (
    tag_id integer NOT NULL,
    email_id integer NOT NULL
);


ALTER TABLE public.email_tags OWNER TO postgres;

--
-- TOC entry 284 (class 1259 OID 37264)
-- Name: email_templates; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.email_templates (
    id integer NOT NULL,
    name character varying(255) NOT NULL,
    subject character varying(255) NOT NULL,
    content text NOT NULL,
    created_at timestamp with time zone,
    updated_at timestamp with time zone
);


ALTER TABLE public.email_templates OWNER TO postgres;

--
-- TOC entry 283 (class 1259 OID 37263)
-- Name: email_templates_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.email_templates_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.email_templates_id_seq OWNER TO postgres;

--
-- TOC entry 5739 (class 0 OID 0)
-- Dependencies: 283
-- Name: email_templates_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.email_templates_id_seq OWNED BY public.email_templates.id;


--
-- TOC entry 286 (class 1259 OID 37275)
-- Name: emails; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.emails (
    id integer NOT NULL,
    subject character varying(255) DEFAULT NULL::character varying,
    source character varying(255) NOT NULL,
    user_type character varying(255) NOT NULL,
    name character varying(255) DEFAULT NULL::character varying,
    reply text,
    is_read boolean DEFAULT false NOT NULL,
    folders jsonb,
    "from" jsonb,
    sender jsonb,
    reply_to jsonb,
    cc jsonb,
    bcc jsonb,
    unique_id character varying(255) DEFAULT NULL::character varying,
    message_id character varying(255) NOT NULL,
    reference_ids jsonb,
    person_id integer,
    lead_id integer,
    created_at timestamp with time zone,
    updated_at timestamp with time zone,
    parent_id integer
);


ALTER TABLE public.emails OWNER TO postgres;

--
-- TOC entry 285 (class 1259 OID 37274)
-- Name: emails_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.emails_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.emails_id_seq OWNER TO postgres;

--
-- TOC entry 5740 (class 0 OID 0)
-- Dependencies: 285
-- Name: emails_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.emails_id_seq OWNED BY public.emails.id;


--
-- TOC entry 291 (class 1259 OID 37343)
-- Name: failed_jobs; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.failed_jobs (
    id bigint NOT NULL,
    uuid character varying(255) NOT NULL,
    connection text NOT NULL,
    queue text NOT NULL,
    payload text NOT NULL,
    exception text NOT NULL,
    failed_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


ALTER TABLE public.failed_jobs OWNER TO postgres;

--
-- TOC entry 290 (class 1259 OID 37342)
-- Name: failed_jobs_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.failed_jobs_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.failed_jobs_id_seq OWNER TO postgres;

--
-- TOC entry 5741 (class 0 OID 0)
-- Dependencies: 290
-- Name: failed_jobs_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.failed_jobs_id_seq OWNED BY public.failed_jobs.id;


--
-- TOC entry 293 (class 1259 OID 37355)
-- Name: google_contact_accounts; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.google_contact_accounts (
    id bigint NOT NULL,
    user_id integer NOT NULL,
    google_email character varying(255) NOT NULL,
    access_token text NOT NULL,
    refresh_token text,
    expires_at timestamp with time zone,
    scopes text,
    created_at timestamp with time zone,
    updated_at timestamp with time zone
);


ALTER TABLE public.google_contact_accounts OWNER TO postgres;

--
-- TOC entry 292 (class 1259 OID 37354)
-- Name: google_contact_accounts_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.google_contact_accounts_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.google_contact_accounts_id_seq OWNER TO postgres;

--
-- TOC entry 5742 (class 0 OID 0)
-- Dependencies: 292
-- Name: google_contact_accounts_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.google_contact_accounts_id_seq OWNED BY public.google_contact_accounts.id;


--
-- TOC entry 223 (class 1259 OID 36663)
-- Name: groups; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.groups (
    id integer NOT NULL,
    name character varying(255) NOT NULL,
    description character varying(255) DEFAULT NULL::character varying,
    created_at timestamp with time zone,
    updated_at timestamp with time zone
);


ALTER TABLE public.groups OWNER TO postgres;

--
-- TOC entry 222 (class 1259 OID 36662)
-- Name: groups_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.groups_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.groups_id_seq OWNER TO postgres;

--
-- TOC entry 5743 (class 0 OID 0)
-- Dependencies: 222
-- Name: groups_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.groups_id_seq OWNED BY public.groups.id;


--
-- TOC entry 305 (class 1259 OID 37451)
-- Name: import_batches; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.import_batches (
    id integer NOT NULL,
    state character varying(255) DEFAULT 'pending'::character varying NOT NULL,
    data jsonb NOT NULL,
    summary jsonb,
    import_id integer NOT NULL
);


ALTER TABLE public.import_batches OWNER TO postgres;

--
-- TOC entry 304 (class 1259 OID 37450)
-- Name: import_batches_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.import_batches_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.import_batches_id_seq OWNER TO postgres;

--
-- TOC entry 5744 (class 0 OID 0)
-- Dependencies: 304
-- Name: import_batches_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.import_batches_id_seq OWNED BY public.import_batches.id;


--
-- TOC entry 303 (class 1259 OID 37435)
-- Name: imports; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.imports (
    id integer NOT NULL,
    state character varying(255) DEFAULT 'pending'::character varying NOT NULL,
    process_in_queue boolean DEFAULT true NOT NULL,
    type character varying(255) NOT NULL,
    action character varying(255) NOT NULL,
    validation_strategy character varying(255) NOT NULL,
    allowed_errors integer DEFAULT 0 NOT NULL,
    processed_rows_count integer DEFAULT 0 NOT NULL,
    invalid_rows_count integer DEFAULT 0 NOT NULL,
    errors_count integer DEFAULT 0 NOT NULL,
    errors jsonb,
    field_separator character varying(255) NOT NULL,
    file_path character varying(255) NOT NULL,
    error_file_path character varying(255) DEFAULT NULL::character varying,
    summary jsonb,
    started_at timestamp with time zone,
    completed_at timestamp with time zone,
    created_at timestamp with time zone,
    updated_at timestamp with time zone
);


ALTER TABLE public.imports OWNER TO postgres;

--
-- TOC entry 302 (class 1259 OID 37434)
-- Name: imports_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.imports_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.imports_id_seq OWNER TO postgres;

--
-- TOC entry 5745 (class 0 OID 0)
-- Dependencies: 302
-- Name: imports_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.imports_id_seq OWNED BY public.imports.id;


--
-- TOC entry 306 (class 1259 OID 37466)
-- Name: job_batches; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.job_batches (
    id character varying(255) NOT NULL,
    name character varying(255) NOT NULL,
    total_jobs integer NOT NULL,
    pending_jobs integer NOT NULL,
    failed_jobs integer NOT NULL,
    failed_job_ids text NOT NULL,
    options text,
    cancelled_at integer,
    created_at integer NOT NULL,
    finished_at integer
);


ALTER TABLE public.job_batches OWNER TO postgres;

--
-- TOC entry 308 (class 1259 OID 37474)
-- Name: jobs; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.jobs (
    id bigint NOT NULL,
    queue character varying(255) NOT NULL,
    payload text NOT NULL,
    attempts smallint NOT NULL,
    reserved_at integer,
    available_at integer NOT NULL,
    created_at integer NOT NULL
);


ALTER TABLE public.jobs OWNER TO postgres;

--
-- TOC entry 307 (class 1259 OID 37473)
-- Name: jobs_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.jobs_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.jobs_id_seq OWNER TO postgres;

--
-- TOC entry 5746 (class 0 OID 0)
-- Dependencies: 307
-- Name: jobs_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.jobs_id_seq OWNED BY public.jobs.id;


--
-- TOC entry 270 (class 1259 OID 37108)
-- Name: lead_activities; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.lead_activities (
    activity_id integer NOT NULL,
    lead_id integer NOT NULL
);


ALTER TABLE public.lead_activities OWNER TO postgres;

--
-- TOC entry 249 (class 1259 OID 36852)
-- Name: lead_pipeline_stages; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.lead_pipeline_stages (
    id integer NOT NULL,
    code character varying(255) DEFAULT NULL::character varying,
    name character varying(255) DEFAULT NULL::character varying,
    probability integer DEFAULT 0 NOT NULL,
    sort_order integer DEFAULT 0 NOT NULL,
    lead_pipeline_id integer NOT NULL
);


ALTER TABLE public.lead_pipeline_stages OWNER TO postgres;

--
-- TOC entry 248 (class 1259 OID 36851)
-- Name: lead_pipeline_stages_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.lead_pipeline_stages_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.lead_pipeline_stages_id_seq OWNER TO postgres;

--
-- TOC entry 5747 (class 0 OID 0)
-- Dependencies: 248
-- Name: lead_pipeline_stages_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.lead_pipeline_stages_id_seq OWNED BY public.lead_pipeline_stages.id;


--
-- TOC entry 247 (class 1259 OID 36841)
-- Name: lead_pipelines; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.lead_pipelines (
    id integer NOT NULL,
    name character varying(255) NOT NULL,
    is_default boolean DEFAULT false NOT NULL,
    rotten_days integer DEFAULT 30 NOT NULL,
    created_at timestamp with time zone,
    updated_at timestamp with time zone
);


ALTER TABLE public.lead_pipelines OWNER TO postgres;

--
-- TOC entry 246 (class 1259 OID 36840)
-- Name: lead_pipelines_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.lead_pipelines_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.lead_pipelines_id_seq OWNER TO postgres;

--
-- TOC entry 5748 (class 0 OID 0)
-- Dependencies: 246
-- Name: lead_pipelines_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.lead_pipelines_id_seq OWNED BY public.lead_pipelines.id;


--
-- TOC entry 258 (class 1259 OID 36962)
-- Name: lead_products; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.lead_products (
    id integer NOT NULL,
    quantity integer DEFAULT 0 NOT NULL,
    price numeric(12,4) DEFAULT NULL::numeric,
    amount numeric(12,4) DEFAULT NULL::numeric,
    lead_id integer NOT NULL,
    product_id integer NOT NULL,
    created_at timestamp with time zone,
    updated_at timestamp with time zone
);


ALTER TABLE public.lead_products OWNER TO postgres;

--
-- TOC entry 257 (class 1259 OID 36961)
-- Name: lead_products_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.lead_products_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.lead_products_id_seq OWNER TO postgres;

--
-- TOC entry 5749 (class 0 OID 0)
-- Dependencies: 257
-- Name: lead_products_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.lead_products_id_seq OWNED BY public.lead_products.id;


--
-- TOC entry 263 (class 1259 OID 37035)
-- Name: lead_quotes; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.lead_quotes (
    quote_id integer NOT NULL,
    lead_id integer NOT NULL
);


ALTER TABLE public.lead_quotes OWNER TO postgres;

--
-- TOC entry 243 (class 1259 OID 36827)
-- Name: lead_sources; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.lead_sources (
    id integer NOT NULL,
    name character varying(255) NOT NULL,
    created_at timestamp with time zone,
    updated_at timestamp with time zone
);


ALTER TABLE public.lead_sources OWNER TO postgres;

--
-- TOC entry 242 (class 1259 OID 36826)
-- Name: lead_sources_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.lead_sources_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.lead_sources_id_seq OWNER TO postgres;

--
-- TOC entry 5750 (class 0 OID 0)
-- Dependencies: 242
-- Name: lead_sources_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.lead_sources_id_seq OWNED BY public.lead_sources.id;


--
-- TOC entry 251 (class 1259 OID 36875)
-- Name: lead_stages; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.lead_stages (
    id integer NOT NULL,
    code character varying(255) NOT NULL,
    name character varying(255) NOT NULL,
    is_user_defined boolean DEFAULT true NOT NULL,
    created_at timestamp with time zone,
    updated_at timestamp with time zone
);


ALTER TABLE public.lead_stages OWNER TO postgres;

--
-- TOC entry 250 (class 1259 OID 36874)
-- Name: lead_stages_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.lead_stages_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.lead_stages_id_seq OWNER TO postgres;

--
-- TOC entry 5751 (class 0 OID 0)
-- Dependencies: 250
-- Name: lead_stages_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.lead_stages_id_seq OWNED BY public.lead_stages.id;


--
-- TOC entry 256 (class 1259 OID 36946)
-- Name: lead_tags; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.lead_tags (
    tag_id integer NOT NULL,
    lead_id integer NOT NULL
);


ALTER TABLE public.lead_tags OWNER TO postgres;

--
-- TOC entry 245 (class 1259 OID 36834)
-- Name: lead_types; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.lead_types (
    id integer NOT NULL,
    name character varying(255) NOT NULL,
    created_at timestamp with time zone,
    updated_at timestamp with time zone
);


ALTER TABLE public.lead_types OWNER TO postgres;

--
-- TOC entry 244 (class 1259 OID 36833)
-- Name: lead_types_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.lead_types_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.lead_types_id_seq OWNER TO postgres;

--
-- TOC entry 5752 (class 0 OID 0)
-- Dependencies: 244
-- Name: lead_types_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.lead_types_id_seq OWNED BY public.lead_types.id;


--
-- TOC entry 253 (class 1259 OID 36885)
-- Name: leads; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.leads (
    id integer NOT NULL,
    title character varying(255) NOT NULL,
    description text,
    lead_value numeric(12,4) DEFAULT NULL::numeric,
    status boolean,
    lost_reason text,
    closed_at timestamp with time zone,
    user_id integer,
    person_id integer,
    lead_source_id integer,
    lead_type_id integer,
    lead_pipeline_id integer,
    lead_pipeline_stage_id integer,
    created_at timestamp with time zone,
    updated_at timestamp with time zone,
    expected_close_date date
);


ALTER TABLE public.leads OWNER TO postgres;

--
-- TOC entry 252 (class 1259 OID 36884)
-- Name: leads_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.leads_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.leads_id_seq OWNER TO postgres;

--
-- TOC entry 5753 (class 0 OID 0)
-- Dependencies: 252
-- Name: leads_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.leads_id_seq OWNED BY public.leads.id;


--
-- TOC entry 312 (class 1259 OID 37493)
-- Name: marketing_campaigns; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.marketing_campaigns (
    id integer NOT NULL,
    name character varying(255) NOT NULL,
    subject character varying(255) NOT NULL,
    status boolean DEFAULT false NOT NULL,
    type character varying(255) NOT NULL,
    mail_to character varying(255) NOT NULL,
    spooling character varying(255) DEFAULT NULL::character varying,
    marketing_template_id integer,
    marketing_event_id integer,
    created_at timestamp with time zone,
    updated_at timestamp with time zone
);


ALTER TABLE public.marketing_campaigns OWNER TO postgres;

--
-- TOC entry 311 (class 1259 OID 37492)
-- Name: marketing_campaigns_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.marketing_campaigns_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.marketing_campaigns_id_seq OWNER TO postgres;

--
-- TOC entry 5754 (class 0 OID 0)
-- Dependencies: 311
-- Name: marketing_campaigns_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.marketing_campaigns_id_seq OWNED BY public.marketing_campaigns.id;


--
-- TOC entry 310 (class 1259 OID 37484)
-- Name: marketing_events; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.marketing_events (
    id integer NOT NULL,
    name character varying(255) NOT NULL,
    description character varying(255) NOT NULL,
    date date NOT NULL,
    created_at timestamp with time zone,
    updated_at timestamp with time zone
);


ALTER TABLE public.marketing_events OWNER TO postgres;

--
-- TOC entry 309 (class 1259 OID 37483)
-- Name: marketing_events_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.marketing_events_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.marketing_events_id_seq OWNER TO postgres;

--
-- TOC entry 5755 (class 0 OID 0)
-- Dependencies: 309
-- Name: marketing_events_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.marketing_events_id_seq OWNED BY public.marketing_events.id;


--
-- TOC entry 314 (class 1259 OID 37516)
-- Name: migrations; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.migrations (
    id integer NOT NULL,
    migration character varying(255) NOT NULL,
    batch integer NOT NULL
);


ALTER TABLE public.migrations OWNER TO postgres;

--
-- TOC entry 313 (class 1259 OID 37515)
-- Name: migrations_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.migrations_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.migrations_id_seq OWNER TO postgres;

--
-- TOC entry 5756 (class 0 OID 0)
-- Dependencies: 313
-- Name: migrations_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.migrations_id_seq OWNED BY public.migrations.id;


--
-- TOC entry 231 (class 1259 OID 36718)
-- Name: organizations; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.organizations (
    id integer NOT NULL,
    name character varying(255) NOT NULL,
    address jsonb,
    created_at timestamp with time zone,
    updated_at timestamp with time zone,
    user_id integer
);


ALTER TABLE public.organizations OWNER TO postgres;

--
-- TOC entry 230 (class 1259 OID 36717)
-- Name: organizations_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.organizations_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.organizations_id_seq OWNER TO postgres;

--
-- TOC entry 5757 (class 0 OID 0)
-- Dependencies: 230
-- Name: organizations_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.organizations_id_seq OWNED BY public.organizations.id;


--
-- TOC entry 271 (class 1259 OID 37123)
-- Name: person_activities; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.person_activities (
    activity_id integer NOT NULL,
    person_id integer NOT NULL
);


ALTER TABLE public.person_activities OWNER TO postgres;

--
-- TOC entry 272 (class 1259 OID 37138)
-- Name: person_tags; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.person_tags (
    tag_id integer NOT NULL,
    person_id integer NOT NULL
);


ALTER TABLE public.person_tags OWNER TO postgres;

--
-- TOC entry 316 (class 1259 OID 37523)
-- Name: personal_access_tokens; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.personal_access_tokens (
    id bigint NOT NULL,
    tokenable_type character varying(255) NOT NULL,
    tokenable_id bigint NOT NULL,
    name character varying(255) NOT NULL,
    token character varying(64) NOT NULL,
    abilities text,
    last_used_at timestamp with time zone,
    expires_at timestamp with time zone,
    created_at timestamp with time zone,
    updated_at timestamp with time zone
);


ALTER TABLE public.personal_access_tokens OWNER TO postgres;

--
-- TOC entry 315 (class 1259 OID 37522)
-- Name: personal_access_tokens_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.personal_access_tokens_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.personal_access_tokens_id_seq OWNER TO postgres;

--
-- TOC entry 5758 (class 0 OID 0)
-- Dependencies: 315
-- Name: personal_access_tokens_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.personal_access_tokens_id_seq OWNED BY public.personal_access_tokens.id;


--
-- TOC entry 233 (class 1259 OID 36735)
-- Name: persons; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.persons (
    id integer NOT NULL,
    name character varying(255) NOT NULL,
    emails jsonb NOT NULL,
    contact_numbers jsonb,
    organization_id integer,
    created_at timestamp with time zone,
    updated_at timestamp with time zone,
    job_title character varying(255) DEFAULT NULL::character varying,
    user_id integer,
    unique_id character varying(255) DEFAULT NULL::character varying
);


ALTER TABLE public.persons OWNER TO postgres;

--
-- TOC entry 232 (class 1259 OID 36734)
-- Name: persons_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.persons_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.persons_id_seq OWNER TO postgres;

--
-- TOC entry 5759 (class 0 OID 0)
-- Dependencies: 232
-- Name: persons_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.persons_id_seq OWNED BY public.persons.id;


--
-- TOC entry 273 (class 1259 OID 37153)
-- Name: product_activities; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.product_activities (
    activity_id integer NOT NULL,
    product_id integer NOT NULL
);


ALTER TABLE public.product_activities OWNER TO postgres;

--
-- TOC entry 280 (class 1259 OID 37207)
-- Name: product_inventories; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.product_inventories (
    id integer NOT NULL,
    in_stock integer DEFAULT 0 NOT NULL,
    allocated integer DEFAULT 0 NOT NULL,
    product_id integer NOT NULL,
    warehouse_id integer,
    warehouse_location_id integer,
    created_at timestamp with time zone,
    updated_at timestamp with time zone
);


ALTER TABLE public.product_inventories OWNER TO postgres;

--
-- TOC entry 279 (class 1259 OID 37206)
-- Name: product_inventories_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.product_inventories_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.product_inventories_id_seq OWNER TO postgres;

--
-- TOC entry 5760 (class 0 OID 0)
-- Dependencies: 279
-- Name: product_inventories_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.product_inventories_id_seq OWNED BY public.product_inventories.id;


--
-- TOC entry 274 (class 1259 OID 37168)
-- Name: product_tags; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.product_tags (
    tag_id integer NOT NULL,
    product_id integer NOT NULL
);


ALTER TABLE public.product_tags OWNER TO postgres;

--
-- TOC entry 235 (class 1259 OID 36760)
-- Name: products; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.products (
    id integer NOT NULL,
    sku character varying(255) NOT NULL,
    name character varying(255) DEFAULT NULL::character varying,
    description character varying(255) DEFAULT NULL::character varying,
    quantity integer DEFAULT 0 NOT NULL,
    price numeric(12,4) DEFAULT NULL::numeric,
    created_at timestamp with time zone,
    updated_at timestamp with time zone
);


ALTER TABLE public.products OWNER TO postgres;

--
-- TOC entry 234 (class 1259 OID 36759)
-- Name: products_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.products_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.products_id_seq OWNER TO postgres;

--
-- TOC entry 5761 (class 0 OID 0)
-- Dependencies: 234
-- Name: products_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.products_id_seq OWNED BY public.products.id;


--
-- TOC entry 262 (class 1259 OID 37011)
-- Name: quote_items; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.quote_items (
    id integer NOT NULL,
    sku character varying(255) DEFAULT NULL::character varying,
    name character varying(255) DEFAULT NULL::character varying,
    quantity integer DEFAULT 0,
    price numeric(12,4) DEFAULT 0.0000 NOT NULL,
    coupon_code character varying(255) DEFAULT NULL::character varying,
    discount_percent numeric(12,4) DEFAULT 0.0000,
    discount_amount numeric(12,4) DEFAULT 0.0000,
    tax_percent numeric(12,4) DEFAULT 0.0000,
    tax_amount numeric(12,4) DEFAULT 0.0000,
    total numeric(12,4) DEFAULT 0.0000 NOT NULL,
    product_id integer NOT NULL,
    quote_id integer NOT NULL,
    created_at timestamp with time zone,
    updated_at timestamp with time zone
);


ALTER TABLE public.quote_items OWNER TO postgres;

--
-- TOC entry 261 (class 1259 OID 37010)
-- Name: quote_items_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.quote_items_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.quote_items_id_seq OWNER TO postgres;

--
-- TOC entry 5762 (class 0 OID 0)
-- Dependencies: 261
-- Name: quote_items_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.quote_items_id_seq OWNED BY public.quote_items.id;


--
-- TOC entry 260 (class 1259 OID 36984)
-- Name: quotes; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.quotes (
    id integer NOT NULL,
    subject character varying(255) NOT NULL,
    description text,
    billing_address jsonb,
    shipping_address jsonb,
    discount_percent numeric(12,4) DEFAULT 0.0000,
    discount_amount numeric(12,4) DEFAULT NULL::numeric,
    tax_amount numeric(12,4) DEFAULT NULL::numeric,
    adjustment_amount numeric(12,4) DEFAULT NULL::numeric,
    sub_total numeric(12,4) DEFAULT NULL::numeric,
    grand_total numeric(12,4) DEFAULT NULL::numeric,
    expired_at timestamp with time zone,
    person_id integer NOT NULL,
    user_id integer NOT NULL,
    created_at timestamp with time zone,
    updated_at timestamp with time zone
);


ALTER TABLE public.quotes OWNER TO postgres;

--
-- TOC entry 259 (class 1259 OID 36983)
-- Name: quotes_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.quotes_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.quotes_id_seq OWNER TO postgres;

--
-- TOC entry 5763 (class 0 OID 0)
-- Dependencies: 259
-- Name: quotes_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.quotes_id_seq OWNED BY public.quotes.id;


--
-- TOC entry 219 (class 1259 OID 36622)
-- Name: roles; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.roles (
    id integer NOT NULL,
    name character varying(255) NOT NULL,
    description character varying(255) DEFAULT NULL::character varying,
    permission_type character varying(255) NOT NULL,
    permissions jsonb,
    created_by integer,
    created_at timestamp with time zone,
    updated_at timestamp with time zone
);


ALTER TABLE public.roles OWNER TO postgres;

--
-- TOC entry 218 (class 1259 OID 36621)
-- Name: roles_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.roles_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.roles_id_seq OWNER TO postgres;

--
-- TOC entry 5764 (class 0 OID 0)
-- Dependencies: 218
-- Name: roles_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.roles_id_seq OWNED BY public.roles.id;


--
-- TOC entry 255 (class 1259 OID 36931)
-- Name: tags; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.tags (
    id integer NOT NULL,
    name character varying(255) NOT NULL,
    color character varying(255) DEFAULT NULL::character varying,
    user_id integer NOT NULL,
    created_at timestamp with time zone,
    updated_at timestamp with time zone
);


ALTER TABLE public.tags OWNER TO postgres;

--
-- TOC entry 254 (class 1259 OID 36930)
-- Name: tags_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.tags_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.tags_id_seq OWNER TO postgres;

--
-- TOC entry 5765 (class 0 OID 0)
-- Dependencies: 254
-- Name: tags_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.tags_id_seq OWNED BY public.tags.id;


--
-- TOC entry 224 (class 1259 OID 36674)
-- Name: user_groups; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.user_groups (
    group_id integer NOT NULL,
    user_id integer NOT NULL
);


ALTER TABLE public.user_groups OWNER TO postgres;

--
-- TOC entry 225 (class 1259 OID 36687)
-- Name: user_password_resets; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.user_password_resets (
    email character varying(255) NOT NULL,
    token character varying(255) NOT NULL,
    created_at timestamp with time zone
);


ALTER TABLE public.user_password_resets OWNER TO postgres;

--
-- TOC entry 221 (class 1259 OID 36632)
-- Name: users; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.users (
    id integer NOT NULL,
    name character varying(255) NOT NULL,
    email character varying(255) NOT NULL,
    password character varying(255) DEFAULT NULL::character varying,
    status boolean DEFAULT false NOT NULL,
    view_permission character varying(255) DEFAULT 'global'::character varying,
    role_id integer NOT NULL,
    created_by integer,
    remember_token character varying(100) DEFAULT NULL::character varying,
    created_at timestamp with time zone,
    updated_at timestamp with time zone,
    image character varying(255) DEFAULT NULL::character varying
);


ALTER TABLE public.users OWNER TO postgres;

--
-- TOC entry 220 (class 1259 OID 36631)
-- Name: users_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.users_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.users_id_seq OWNER TO postgres;

--
-- TOC entry 5766 (class 0 OID 0)
-- Dependencies: 220
-- Name: users_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.users_id_seq OWNED BY public.users.id;


--
-- TOC entry 281 (class 1259 OID 37233)
-- Name: warehouse_activities; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.warehouse_activities (
    activity_id integer NOT NULL,
    warehouse_id integer NOT NULL
);


ALTER TABLE public.warehouse_activities OWNER TO postgres;

--
-- TOC entry 278 (class 1259 OID 37193)
-- Name: warehouse_locations; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.warehouse_locations (
    id integer NOT NULL,
    name character varying(255) NOT NULL,
    warehouse_id integer NOT NULL,
    created_at timestamp with time zone,
    updated_at timestamp with time zone
);


ALTER TABLE public.warehouse_locations OWNER TO postgres;

--
-- TOC entry 277 (class 1259 OID 37192)
-- Name: warehouse_locations_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.warehouse_locations_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.warehouse_locations_id_seq OWNER TO postgres;

--
-- TOC entry 5767 (class 0 OID 0)
-- Dependencies: 277
-- Name: warehouse_locations_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.warehouse_locations_id_seq OWNED BY public.warehouse_locations.id;


--
-- TOC entry 282 (class 1259 OID 37248)
-- Name: warehouse_tags; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.warehouse_tags (
    tag_id integer NOT NULL,
    warehouse_id integer NOT NULL
);


ALTER TABLE public.warehouse_tags OWNER TO postgres;

--
-- TOC entry 276 (class 1259 OID 37184)
-- Name: warehouses; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.warehouses (
    id integer NOT NULL,
    name character varying(255) NOT NULL,
    description text,
    contact_name character varying(255) NOT NULL,
    contact_emails jsonb NOT NULL,
    contact_numbers jsonb NOT NULL,
    contact_address jsonb NOT NULL,
    created_at timestamp with time zone,
    updated_at timestamp with time zone
);


ALTER TABLE public.warehouses OWNER TO postgres;

--
-- TOC entry 275 (class 1259 OID 37183)
-- Name: warehouses_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.warehouses_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.warehouses_id_seq OWNER TO postgres;

--
-- TOC entry 5768 (class 0 OID 0)
-- Dependencies: 275
-- Name: warehouses_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.warehouses_id_seq OWNED BY public.warehouses.id;


--
-- TOC entry 320 (class 1259 OID 37558)
-- Name: web_form_attributes; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.web_form_attributes (
    id integer NOT NULL,
    name character varying(255) DEFAULT NULL::character varying,
    placeholder character varying(255) DEFAULT NULL::character varying,
    is_required boolean DEFAULT false NOT NULL,
    is_hidden boolean DEFAULT false NOT NULL,
    sort_order integer,
    attribute_id integer NOT NULL,
    web_form_id integer NOT NULL
);


ALTER TABLE public.web_form_attributes OWNER TO postgres;

--
-- TOC entry 319 (class 1259 OID 37557)
-- Name: web_form_attributes_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.web_form_attributes_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.web_form_attributes_id_seq OWNER TO postgres;

--
-- TOC entry 5769 (class 0 OID 0)
-- Dependencies: 319
-- Name: web_form_attributes_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.web_form_attributes_id_seq OWNED BY public.web_form_attributes.id;


--
-- TOC entry 318 (class 1259 OID 37535)
-- Name: web_forms; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.web_forms (
    id integer NOT NULL,
    form_id character varying(255) NOT NULL,
    title character varying(255) NOT NULL,
    description text,
    submit_button_label text NOT NULL,
    submit_success_action character varying(255) NOT NULL,
    submit_success_content character varying(255) NOT NULL,
    create_lead boolean DEFAULT false NOT NULL,
    lead_pipeline_id integer,
    background_color character varying(255) DEFAULT NULL::character varying,
    form_background_color character varying(255) DEFAULT NULL::character varying,
    form_title_color character varying(255) DEFAULT NULL::character varying,
    form_submit_button_color character varying(255) DEFAULT NULL::character varying,
    attribute_label_color character varying(255) DEFAULT NULL::character varying,
    created_at timestamp with time zone,
    updated_at timestamp with time zone
);


ALTER TABLE public.web_forms OWNER TO postgres;

--
-- TOC entry 317 (class 1259 OID 37534)
-- Name: web_forms_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.web_forms_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.web_forms_id_seq OWNER TO postgres;

--
-- TOC entry 5770 (class 0 OID 0)
-- Dependencies: 317
-- Name: web_forms_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.web_forms_id_seq OWNED BY public.web_forms.id;


--
-- TOC entry 322 (class 1259 OID 37583)
-- Name: webhooks; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.webhooks (
    id bigint NOT NULL,
    name character varying(255) NOT NULL,
    entity_type character varying(255) NOT NULL,
    description character varying(255) DEFAULT NULL::character varying,
    method character varying(255) NOT NULL,
    end_point character varying(255) NOT NULL,
    query_params jsonb,
    headers jsonb,
    payload_type character varying(255) NOT NULL,
    raw_payload_type character varying(255) NOT NULL,
    payload jsonb,
    created_at timestamp with time zone,
    updated_at timestamp with time zone
);


ALTER TABLE public.webhooks OWNER TO postgres;

--
-- TOC entry 321 (class 1259 OID 37582)
-- Name: webhooks_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.webhooks_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.webhooks_id_seq OWNER TO postgres;

--
-- TOC entry 5771 (class 0 OID 0)
-- Dependencies: 321
-- Name: webhooks_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.webhooks_id_seq OWNED BY public.webhooks.id;


--
-- TOC entry 324 (class 1259 OID 37593)
-- Name: workflows; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.workflows (
    id integer NOT NULL,
    name character varying(255) NOT NULL,
    description character varying(255) DEFAULT NULL::character varying,
    entity_type character varying(255) NOT NULL,
    event character varying(255) NOT NULL,
    condition_type character varying(255) DEFAULT 'and'::character varying NOT NULL,
    conditions jsonb,
    actions jsonb,
    created_at timestamp with time zone,
    updated_at timestamp with time zone
);


ALTER TABLE public.workflows OWNER TO postgres;

--
-- TOC entry 323 (class 1259 OID 37592)
-- Name: workflows_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.workflows_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.workflows_id_seq OWNER TO postgres;

--
-- TOC entry 5772 (class 0 OID 0)
-- Dependencies: 323
-- Name: workflows_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.workflows_id_seq OWNED BY public.workflows.id;


--
-- TOC entry 5132 (class 2604 OID 37054)
-- Name: activities id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.activities ALTER COLUMN id SET DEFAULT nextval('public.activities_id_seq'::regclass);


--
-- TOC entry 5136 (class 2604 OID 37072)
-- Name: activity_files id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.activity_files ALTER COLUMN id SET DEFAULT nextval('public.activity_files_id_seq'::regclass);


--
-- TOC entry 5137 (class 2604 OID 37087)
-- Name: activity_participants id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.activity_participants ALTER COLUMN id SET DEFAULT nextval('public.activity_participants_id_seq'::regclass);


--
-- TOC entry 5089 (class 2604 OID 36795)
-- Name: attribute_options id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.attribute_options ALTER COLUMN id SET DEFAULT nextval('public.attribute_options_id_seq'::regclass);


--
-- TOC entry 5091 (class 2604 OID 36809)
-- Name: attribute_values id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.attribute_values ALTER COLUMN id SET DEFAULT nextval('public.attribute_values_id_seq'::regclass);


--
-- TOC entry 5082 (class 2604 OID 36778)
-- Name: attributes id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.attributes ALTER COLUMN id SET DEFAULT nextval('public.attributes_id_seq'::regclass);


--
-- TOC entry 5163 (class 2604 OID 37395)
-- Name: contact_export_batch_items id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.contact_export_batch_items ALTER COLUMN id SET DEFAULT nextval('public.contact_export_batch_items_id_seq'::regclass);


--
-- TOC entry 5156 (class 2604 OID 37374)
-- Name: contact_export_batches id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.contact_export_batches ALTER COLUMN id SET DEFAULT nextval('public.contact_export_batches_id_seq'::regclass);


--
-- TOC entry 5166 (class 2604 OID 37418)
-- Name: core_config id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.core_config ALTER COLUMN id SET DEFAULT nextval('public.core_config_id_seq'::regclass);


--
-- TOC entry 5071 (class 2604 OID 36697)
-- Name: countries id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.countries ALTER COLUMN id SET DEFAULT nextval('public.countries_id_seq'::regclass);


--
-- TOC entry 5072 (class 2604 OID 36706)
-- Name: country_states id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.country_states ALTER COLUMN id SET DEFAULT nextval('public.country_states_id_seq'::regclass);


--
-- TOC entry 5167 (class 2604 OID 37427)
-- Name: datagrid_saved_filters id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.datagrid_saved_filters ALTER COLUMN id SET DEFAULT nextval('public.datagrid_saved_filters_id_seq'::regclass);


--
-- TOC entry 5149 (class 2604 OID 37313)
-- Name: email_attachments id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.email_attachments ALTER COLUMN id SET DEFAULT nextval('public.email_attachments_id_seq'::regclass);


--
-- TOC entry 5143 (class 2604 OID 37267)
-- Name: email_templates id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.email_templates ALTER COLUMN id SET DEFAULT nextval('public.email_templates_id_seq'::regclass);


--
-- TOC entry 5144 (class 2604 OID 37278)
-- Name: emails id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.emails ALTER COLUMN id SET DEFAULT nextval('public.emails_id_seq'::regclass);


--
-- TOC entry 5153 (class 2604 OID 37346)
-- Name: failed_jobs id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.failed_jobs ALTER COLUMN id SET DEFAULT nextval('public.failed_jobs_id_seq'::regclass);


--
-- TOC entry 5155 (class 2604 OID 37358)
-- Name: google_contact_accounts id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.google_contact_accounts ALTER COLUMN id SET DEFAULT nextval('public.google_contact_accounts_id_seq'::regclass);


--
-- TOC entry 5069 (class 2604 OID 36666)
-- Name: groups id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.groups ALTER COLUMN id SET DEFAULT nextval('public.groups_id_seq'::regclass);


--
-- TOC entry 5176 (class 2604 OID 37454)
-- Name: import_batches id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.import_batches ALTER COLUMN id SET DEFAULT nextval('public.import_batches_id_seq'::regclass);


--
-- TOC entry 5168 (class 2604 OID 37438)
-- Name: imports id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.imports ALTER COLUMN id SET DEFAULT nextval('public.imports_id_seq'::regclass);


--
-- TOC entry 5178 (class 2604 OID 37477)
-- Name: jobs id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.jobs ALTER COLUMN id SET DEFAULT nextval('public.jobs_id_seq'::regclass);


--
-- TOC entry 5099 (class 2604 OID 36855)
-- Name: lead_pipeline_stages id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.lead_pipeline_stages ALTER COLUMN id SET DEFAULT nextval('public.lead_pipeline_stages_id_seq'::regclass);


--
-- TOC entry 5096 (class 2604 OID 36844)
-- Name: lead_pipelines id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.lead_pipelines ALTER COLUMN id SET DEFAULT nextval('public.lead_pipelines_id_seq'::regclass);


--
-- TOC entry 5110 (class 2604 OID 36965)
-- Name: lead_products id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.lead_products ALTER COLUMN id SET DEFAULT nextval('public.lead_products_id_seq'::regclass);


--
-- TOC entry 5094 (class 2604 OID 36830)
-- Name: lead_sources id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.lead_sources ALTER COLUMN id SET DEFAULT nextval('public.lead_sources_id_seq'::regclass);


--
-- TOC entry 5104 (class 2604 OID 36878)
-- Name: lead_stages id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.lead_stages ALTER COLUMN id SET DEFAULT nextval('public.lead_stages_id_seq'::regclass);


--
-- TOC entry 5095 (class 2604 OID 36837)
-- Name: lead_types id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.lead_types ALTER COLUMN id SET DEFAULT nextval('public.lead_types_id_seq'::regclass);


--
-- TOC entry 5106 (class 2604 OID 36888)
-- Name: leads id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.leads ALTER COLUMN id SET DEFAULT nextval('public.leads_id_seq'::regclass);


--
-- TOC entry 5180 (class 2604 OID 37496)
-- Name: marketing_campaigns id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.marketing_campaigns ALTER COLUMN id SET DEFAULT nextval('public.marketing_campaigns_id_seq'::regclass);


--
-- TOC entry 5179 (class 2604 OID 37487)
-- Name: marketing_events id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.marketing_events ALTER COLUMN id SET DEFAULT nextval('public.marketing_events_id_seq'::regclass);


--
-- TOC entry 5183 (class 2604 OID 37519)
-- Name: migrations id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.migrations ALTER COLUMN id SET DEFAULT nextval('public.migrations_id_seq'::regclass);


--
-- TOC entry 5073 (class 2604 OID 36721)
-- Name: organizations id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.organizations ALTER COLUMN id SET DEFAULT nextval('public.organizations_id_seq'::regclass);


--
-- TOC entry 5184 (class 2604 OID 37526)
-- Name: personal_access_tokens id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.personal_access_tokens ALTER COLUMN id SET DEFAULT nextval('public.personal_access_tokens_id_seq'::regclass);


--
-- TOC entry 5074 (class 2604 OID 36738)
-- Name: persons id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.persons ALTER COLUMN id SET DEFAULT nextval('public.persons_id_seq'::regclass);


--
-- TOC entry 5140 (class 2604 OID 37210)
-- Name: product_inventories id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.product_inventories ALTER COLUMN id SET DEFAULT nextval('public.product_inventories_id_seq'::regclass);


--
-- TOC entry 5077 (class 2604 OID 36763)
-- Name: products id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.products ALTER COLUMN id SET DEFAULT nextval('public.products_id_seq'::regclass);


--
-- TOC entry 5121 (class 2604 OID 37014)
-- Name: quote_items id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.quote_items ALTER COLUMN id SET DEFAULT nextval('public.quote_items_id_seq'::regclass);


--
-- TOC entry 5114 (class 2604 OID 36987)
-- Name: quotes id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.quotes ALTER COLUMN id SET DEFAULT nextval('public.quotes_id_seq'::regclass);


--
-- TOC entry 5061 (class 2604 OID 36625)
-- Name: roles id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.roles ALTER COLUMN id SET DEFAULT nextval('public.roles_id_seq'::regclass);


--
-- TOC entry 5108 (class 2604 OID 36934)
-- Name: tags id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.tags ALTER COLUMN id SET DEFAULT nextval('public.tags_id_seq'::regclass);


--
-- TOC entry 5063 (class 2604 OID 36635)
-- Name: users id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.users ALTER COLUMN id SET DEFAULT nextval('public.users_id_seq'::regclass);


--
-- TOC entry 5139 (class 2604 OID 37196)
-- Name: warehouse_locations id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.warehouse_locations ALTER COLUMN id SET DEFAULT nextval('public.warehouse_locations_id_seq'::regclass);


--
-- TOC entry 5138 (class 2604 OID 37187)
-- Name: warehouses id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.warehouses ALTER COLUMN id SET DEFAULT nextval('public.warehouses_id_seq'::regclass);


--
-- TOC entry 5192 (class 2604 OID 37561)
-- Name: web_form_attributes id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.web_form_attributes ALTER COLUMN id SET DEFAULT nextval('public.web_form_attributes_id_seq'::regclass);


--
-- TOC entry 5185 (class 2604 OID 37538)
-- Name: web_forms id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.web_forms ALTER COLUMN id SET DEFAULT nextval('public.web_forms_id_seq'::regclass);


--
-- TOC entry 5197 (class 2604 OID 37586)
-- Name: webhooks id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.webhooks ALTER COLUMN id SET DEFAULT nextval('public.webhooks_id_seq'::regclass);


--
-- TOC entry 5199 (class 2604 OID 37596)
-- Name: workflows id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.workflows ALTER COLUMN id SET DEFAULT nextval('public.workflows_id_seq'::regclass);


--
-- TOC entry 5660 (class 0 OID 37051)
-- Dependencies: 265
-- Data for Name: activities; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.activities (id, title, type, comment, additional, schedule_from, schedule_to, is_done, user_id, created_at, updated_at, location) FROM stdin;
7	Created	system	\N	\N	\N	\N	t	1	2026-09-17 09:35:20+05:30	2026-09-17 09:35:20+05:30	\N
8	Updated Name	system	\N	{"new": {"label": "NGO", "value": "NGO"}, "old": {"label": null, "value": null}, "attribute": "Name"}	\N	\N	t	1	2026-09-17 09:35:23+05:30	2026-09-17 09:35:23+05:30	\N
9	Updated SKU	system	\N	{"new": {"label": "ngo-01", "value": "ngo-01"}, "old": {"label": null, "value": null}, "attribute": "SKU"}	\N	\N	t	1	2026-09-17 09:35:27+05:30	2026-09-17 09:35:27+05:30	\N
10	Updated Quantity	system	\N	{"new": {"label": 5, "value": 5}, "old": {"label": null, "value": null}, "attribute": "Quantity"}	\N	\N	t	1	2026-09-17 09:35:29+05:30	2026-09-17 09:35:29+05:30	\N
11	Updated Price	system	\N	{"new": {"label": "$50,000.00", "value": 50000}, "old": {"label": "$0.00", "value": null}, "attribute": "Price"}	\N	\N	t	1	2026-09-17 09:35:31+05:30	2026-09-17 09:35:31+05:30	\N
\.


--
-- TOC entry 5662 (class 0 OID 37069)
-- Dependencies: 267
-- Data for Name: activity_files; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.activity_files (id, name, path, activity_id, created_at, updated_at) FROM stdin;
\.


--
-- TOC entry 5664 (class 0 OID 37084)
-- Dependencies: 269
-- Data for Name: activity_participants; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.activity_participants (id, activity_id, user_id, person_id) FROM stdin;
\.


--
-- TOC entry 5634 (class 0 OID 36792)
-- Dependencies: 239
-- Data for Name: attribute_options; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.attribute_options (id, name, sort_order, attribute_id) FROM stdin;
\.


--
-- TOC entry 5636 (class 0 OID 36806)
-- Dependencies: 241
-- Data for Name: attribute_values; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.attribute_values (id, entity_type, text_value, boolean_value, integer_value, float_value, datetime_value, date_value, "json_value", entity_id, attribute_id, unique_id) FROM stdin;
6	products	NGO	\N	\N	\N	\N	\N	\N	3	37	\N
7	products	\N	\N	\N	\N	\N	\N	\N	3	38	\N
8	products	ngo-01	\N	\N	\N	\N	\N	\N	3	39	\N
9	products	5	\N	\N	\N	\N	\N	\N	3	40	\N
10	products	\N	\N	\N	50000	\N	\N	\N	3	41	\N
11	organizations	test organization	\N	\N	\N	\N	\N	\N	1	34	\N
12	organizations	\N	\N	\N	\N	\N	\N	{"city": "nashik", "state": "MH", "address": "Test address", "country": "IN", "postcode": null}	1	35	\N
13	organizations	\N	\N	1	\N	\N	\N	\N	1	36	\N
\.


--
-- TOC entry 5632 (class 0 OID 36775)
-- Dependencies: 237
-- Data for Name: attributes; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.attributes (id, code, name, type, lookup_type, entity_type, sort_order, validation, is_required, is_unique, quick_add, is_user_defined, created_at, updated_at) FROM stdin;
19	title	Title	text	\N	leads	1	\N	t	f	t	f	2026-09-16 04:49:02+05:30	2026-09-16 04:49:02+05:30
20	description	Description	textarea	\N	leads	2	\N	f	f	t	f	2026-09-16 04:49:02+05:30	2026-09-16 04:49:02+05:30
21	lead_value	Estimated Lead Value	price	\N	leads	3	decimal	f	f	f	f	2026-09-16 04:49:02+05:30	2026-09-16 04:49:02+05:30
22	lead_source_id	Source	select	lead_sources	leads	4	\N	t	f	f	f	2026-09-16 04:49:02+05:30	2026-09-16 04:49:02+05:30
23	lead_type_id	Type	select	lead_types	leads	5	\N	t	f	f	f	2026-09-16 04:49:02+05:30	2026-09-16 04:49:02+05:30
24	user_id	Sales Owner	select	users	leads	7	\N	f	f	f	f	2026-09-16 04:49:02+05:30	2026-09-16 04:49:02+05:30
25	expected_close_date	Expected Close Date	date	\N	leads	8	\N	f	f	f	f	2026-09-16 04:49:02+05:30	2026-09-16 04:49:02+05:30
26	lead_pipeline_id	Pipeline	lookup	lead_pipelines	leads	9	\N	t	f	f	f	2026-09-16 04:49:02+05:30	2026-09-16 04:49:02+05:30
27	lead_pipeline_stage_id	Stage	lookup	lead_pipeline_stages	leads	10	\N	t	f	f	f	2026-09-16 04:49:02+05:30	2026-09-16 04:49:02+05:30
28	name	Name	text	\N	persons	1	\N	t	f	t	f	2026-09-16 04:49:02+05:30	2026-09-16 04:49:02+05:30
29	emails	Emails	email	\N	persons	2	\N	t	t	t	f	2026-09-16 04:49:02+05:30	2026-09-16 04:49:02+05:30
30	contact_numbers	Contact Numbers	phone	\N	persons	3	numeric	f	t	t	f	2026-09-16 04:49:02+05:30	2026-09-16 04:49:02+05:30
31	job_title	Job Title	text	\N	persons	4	\N	f	f	f	f	2026-09-16 04:49:02+05:30	2026-09-16 04:49:02+05:30
32	user_id	Sales Owner	lookup	users	persons	5	\N	f	f	f	f	2026-09-16 04:49:02+05:30	2026-09-16 04:49:02+05:30
33	organization_id	Organization	lookup	organizations	persons	6	\N	f	f	f	f	2026-09-16 04:49:02+05:30	2026-09-16 04:49:02+05:30
34	name	Name	text	\N	organizations	1	\N	t	t	t	f	2026-09-16 04:49:02+05:30	2026-09-16 04:49:02+05:30
35	address	Address	address	\N	organizations	2	\N	f	f	t	f	2026-09-16 04:49:02+05:30	2026-09-16 04:49:02+05:30
36	user_id	Sales Owner	lookup	users	organizations	3	\N	f	f	t	f	2026-09-16 04:49:02+05:30	2026-09-16 04:49:02+05:30
37	name	Name	text	\N	products	1	\N	t	f	t	f	2026-09-16 04:49:02+05:30	2026-09-16 04:49:02+05:30
38	description	Description	textarea	\N	products	2	\N	f	f	t	f	2026-09-16 04:49:02+05:30	2026-09-16 04:49:02+05:30
39	sku	SKU	text	\N	products	3	\N	t	t	t	f	2026-09-16 04:49:02+05:30	2026-09-16 04:49:02+05:30
40	quantity	Quantity	text	\N	products	4	numeric	t	f	t	f	2026-09-16 04:49:02+05:30	2026-09-16 04:49:02+05:30
41	price	Price	price	\N	products	5	decimal	t	f	t	f	2026-09-16 04:49:02+05:30	2026-09-16 04:49:02+05:30
42	user_id	Sales Owner	select	users	quotes	1	\N	t	f	t	f	2026-09-16 04:49:02+05:30	2026-09-16 04:49:02+05:30
43	subject	Subject	text	\N	quotes	2	\N	t	f	t	f	2026-09-16 04:49:02+05:30	2026-09-16 04:49:02+05:30
44	description	Description	textarea	\N	quotes	3	\N	f	f	t	f	2026-09-16 04:49:02+05:30	2026-09-16 04:49:02+05:30
45	billing_address	Billing Address	address	\N	quotes	4	\N	t	f	t	f	2026-09-16 04:49:02+05:30	2026-09-16 04:49:02+05:30
46	shipping_address	Shipping Address	address	\N	quotes	5	\N	f	f	f	f	2026-09-16 04:49:02+05:30	2026-09-16 04:49:02+05:30
47	discount_percent	Discount Percent	text	\N	quotes	6	decimal	f	f	f	f	2026-09-16 04:49:02+05:30	2026-09-16 04:49:02+05:30
48	discount_amount	Discount Amount	price	\N	quotes	7	decimal	f	f	f	f	2026-09-16 04:49:02+05:30	2026-09-16 04:49:02+05:30
49	tax_amount	Tax Amount	price	\N	quotes	8	decimal	f	f	f	f	2026-09-16 04:49:02+05:30	2026-09-16 04:49:02+05:30
50	adjustment_amount	Adjustment Amount	price	\N	quotes	9	decimal	f	f	f	f	2026-09-16 04:49:02+05:30	2026-09-16 04:49:02+05:30
51	sub_total	Sub Total	price	\N	quotes	10	decimal	t	f	f	f	2026-09-16 04:49:02+05:30	2026-09-16 04:49:02+05:30
52	grand_total	Grand Total	price	\N	quotes	11	decimal	t	f	t	f	2026-09-16 04:49:02+05:30	2026-09-16 04:49:02+05:30
53	expired_at	Expired At	date	\N	quotes	12	\N	t	f	t	f	2026-09-16 04:49:02+05:30	2026-09-16 04:49:02+05:30
54	person_id	Person	lookup	persons	quotes	13	\N	t	f	t	f	2026-09-16 04:49:02+05:30	2026-09-16 04:49:02+05:30
55	name	Name	text	\N	warehouses	1	\N	t	f	t	f	2026-09-16 04:49:02+05:30	2026-09-16 04:49:02+05:30
56	description	Description	textarea	\N	warehouses	2	\N	f	f	t	f	2026-09-16 04:49:02+05:30	2026-09-16 04:49:02+05:30
57	contact_name	Contact Name	text	\N	warehouses	3	\N	t	f	t	f	2026-09-16 04:49:02+05:30	2026-09-16 04:49:02+05:30
58	contact_emails	Contact Emails	email	\N	warehouses	4	\N	t	t	t	f	2026-09-16 04:49:02+05:30	2026-09-16 04:49:02+05:30
59	contact_numbers	Contact Numbers	phone	\N	warehouses	5	numeric	f	t	t	f	2026-09-16 04:49:02+05:30	2026-09-16 04:49:02+05:30
60	contact_address	Contact Address	address	\N	warehouses	6	\N	t	f	f	f	2026-09-16 04:49:02+05:30	2026-09-16 04:49:02+05:30
\.


--
-- TOC entry 5692 (class 0 OID 37392)
-- Dependencies: 297
-- Data for Name: contact_export_batch_items; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.contact_export_batch_items (id, batch_id, person_id, status, google_resource_name, error_message, created_at, updated_at) FROM stdin;
\.


--
-- TOC entry 5690 (class 0 OID 37371)
-- Dependencies: 295
-- Data for Name: contact_export_batches; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.contact_export_batches (id, user_id, state, total_count, exported_count, duplicate_count, failed_count, error_file_path, started_at, completed_at, created_at, updated_at) FROM stdin;
\.


--
-- TOC entry 5694 (class 0 OID 37415)
-- Dependencies: 299
-- Data for Name: core_config; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.core_config (id, code, value, created_at, updated_at) FROM stdin;
1	installation.completed	1	2026-09-16 04:49:42+05:30	2026-09-16 04:49:42+05:30
\.


--
-- TOC entry 5622 (class 0 OID 36694)
-- Dependencies: 227
-- Data for Name: countries; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.countries (id, code, name) FROM stdin;
1	AF	Afghanistan
2	AX	Åland Islands
3	AL	Albania
4	DZ	Algeria
5	AS	American Samoa
6	AD	Andorra
7	AO	Angola
8	AI	Anguilla
9	AQ	Antarctica
10	AG	Antigua & Barbuda
11	AR	Argentina
12	AM	Armenia
13	AW	Aruba
14	AC	Ascension Island
15	AU	Australia
16	AT	Austria
17	AZ	Azerbaijan
18	BS	Bahamas
19	BH	Bahrain
20	BD	Bangladesh
21	BB	Barbados
22	BY	Belarus
23	BE	Belgium
24	BZ	Belize
25	BJ	Benin
26	BM	Bermuda
27	BT	Bhutan
28	BO	Bolivia
29	BA	Bosnia & Herzegovina
30	BW	Botswana
31	BR	Brazil
32	IO	British Indian Ocean Territory
33	VG	British Virgin Islands
34	BN	Brunei
35	BG	Bulgaria
36	BF	Burkina Faso
37	BI	Burundi
38	KH	Cambodia
39	CM	Cameroon
40	CA	Canada
41	IC	Canary Islands
42	CV	Cape Verde
43	BQ	Caribbean Netherlands
44	KY	Cayman Islands
45	CF	Central African Republic
46	EA	Ceuta & Melilla
47	TD	Chad
48	CL	Chile
49	CN	China
50	CX	Christmas Island
51	CC	Cocos (Keeling) Islands
52	CO	Colombia
53	KM	Comoros
54	CG	Congo - Brazzaville
55	CD	Congo - Kinshasa
56	CK	Cook Islands
57	CR	Costa Rica
58	CI	Côte d’Ivoire
59	HR	Croatia
60	CU	Cuba
61	CW	Curaçao
62	CY	Cyprus
63	CZ	Czechia
64	DK	Denmark
65	DG	Diego Garcia
66	DJ	Djibouti
67	DM	Dominica
68	DO	Dominican Republic
69	EC	Ecuador
70	EG	Egypt
71	SV	El Salvador
72	GQ	Equatorial Guinea
73	ER	Eritrea
74	EE	Estonia
75	ET	Ethiopia
76	EZ	Eurozone
77	FK	Falkland Islands
78	FO	Faroe Islands
79	FJ	Fiji
80	FI	Finland
81	FR	France
82	GF	French Guiana
83	PF	French Polynesia
84	TF	French Southern Territories
85	GA	Gabon
86	GM	Gambia
87	GE	Georgia
88	DE	Germany
89	GH	Ghana
90	GI	Gibraltar
91	GR	Greece
92	GL	Greenland
93	GD	Grenada
94	GP	Guadeloupe
95	GU	Guam
96	GT	Guatemala
97	GG	Guernsey
98	GN	Guinea
99	GW	Guinea-Bissau
100	GY	Guyana
101	HT	Haiti
102	HN	Honduras
103	HK	Hong Kong SAR China
104	HU	Hungary
105	IS	Iceland
106	IN	India
107	ID	Indonesia
108	IR	Iran
109	IQ	Iraq
110	IE	Ireland
111	IM	Isle of Man
112	IL	Israel
113	IT	Italy
114	JM	Jamaica
115	JP	Japan
116	JE	Jersey
117	JO	Jordan
118	KZ	Kazakhstan
119	KE	Kenya
120	KI	Kiribati
121	XK	Kosovo
122	KW	Kuwait
123	KG	Kyrgyzstan
124	LA	Laos
125	LV	Latvia
126	LB	Lebanon
127	LS	Lesotho
128	LR	Liberia
129	LY	Libya
130	LI	Liechtenstein
131	LT	Lithuania
132	LU	Luxembourg
133	MO	Macau SAR China
134	MK	Macedonia
135	MG	Madagascar
136	MW	Malawi
137	MY	Malaysia
138	MV	Maldives
139	ML	Mali
140	MT	Malta
141	MH	Marshall Islands
142	MQ	Martinique
143	MR	Mauritania
144	MU	Mauritius
145	YT	Mayotte
146	MX	Mexico
147	FM	Micronesia
148	MD	Moldova
149	MC	Monaco
150	MN	Mongolia
151	ME	Montenegro
152	MS	Montserrat
153	MA	Morocco
154	MZ	Mozambique
155	MM	Myanmar (Burma)
156	NA	Namibia
157	NR	Nauru
158	NP	Nepal
159	NL	Netherlands
160	NC	New Caledonia
161	NZ	New Zealand
162	NI	Nicaragua
163	NE	Niger
164	NG	Nigeria
165	NU	Niue
166	NF	Norfolk Island
167	KP	North Korea
168	MP	Northern Mariana Islands
169	NO	Norway
170	OM	Oman
171	PK	Pakistan
172	PW	Palau
173	PS	Palestinian Territories
174	PA	Panama
175	PG	Papua New Guinea
176	PY	Paraguay
177	PE	Peru
178	PH	Philippines
179	PN	Pitcairn Islands
180	PL	Poland
181	PT	Portugal
182	PR	Puerto Rico
183	QA	Qatar
184	RE	Réunion
185	RO	Romania
186	RU	Russia
187	RW	Rwanda
188	WS	Samoa
189	SM	San Marino
190	ST	São Tomé & Príncipe
191	SA	Saudi Arabia
192	SN	Senegal
193	RS	Serbia
194	SC	Seychelles
195	SL	Sierra Leone
196	SG	Singapore
197	SX	Sint Maarten
198	SK	Slovakia
199	SI	Slovenia
200	SB	Solomon Islands
201	SO	Somalia
202	ZA	South Africa
203	GS	South Georgia & South Sandwich Islands
204	KR	South Korea
205	SS	South Sudan
206	ES	Spain
207	LK	Sri Lanka
208	BL	St. Barthélemy
209	SH	St. Helena
210	KN	St. Kitts & Nevis
211	LC	St. Lucia
212	MF	St. Martin
213	PM	St. Pierre & Miquelon
214	VC	St. Vincent & Grenadines
215	SD	Sudan
216	SR	Suriname
217	SJ	Svalbard & Jan Mayen
218	SZ	Swaziland
219	SE	Sweden
220	CH	Switzerland
221	SY	Syria
222	TW	Taiwan
223	TJ	Tajikistan
224	TZ	Tanzania
225	TH	Thailand
226	TL	Timor-Leste
227	TG	Togo
228	TK	Tokelau
229	TO	Tonga
230	TT	Trinidad & Tobago
231	TA	Tristan da Cunha
232	TN	Tunisia
233	TR	Turkey
234	TM	Turkmenistan
235	TC	Turks & Caicos Islands
236	TV	Tuvalu
237	UM	U.S. Outlying Islands
238	VI	U.S. Virgin Islands
239	UG	Uganda
240	UA	Ukraine
241	AE	United Arab Emirates
242	GB	United Kingdom
243	UN	United Nations
244	US	United States
245	UY	Uruguay
246	UZ	Uzbekistan
247	VU	Vanuatu
248	VA	Vatican City
249	VE	Venezuela
250	VN	Vietnam
251	WF	Wallis & Futuna
252	EH	Western Sahara
253	YE	Yemen
254	ZM	Zambia
255	ZW	Zimbabwe
\.


--
-- TOC entry 5624 (class 0 OID 36703)
-- Dependencies: 229
-- Data for Name: country_states; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.country_states (id, country_code, code, name, country_id) FROM stdin;
1	US	AL	Alabama	244
2	US	AK	Alaska	244
3	US	AS	American Samoa	244
4	US	AZ	Arizona	244
5	US	AR	Arkansas	244
6	US	AE	Armed Forces Africa	244
7	US	AA	Armed Forces Americas	244
8	US	AE	Armed Forces Canada	244
9	US	AE	Armed Forces Europe	244
10	US	AE	Armed Forces Middle East	244
11	US	AP	Armed Forces Pacific	244
12	US	CA	California	244
13	US	CO	Colorado	244
14	US	CT	Connecticut	244
15	US	DE	Delaware	244
16	US	DC	District of Columbia	244
17	US	FM	Federated States Of Micronesia	244
18	US	FL	Florida	244
19	US	GA	Georgia	244
20	US	GU	Guam	244
21	US	HI	Hawaii	244
22	US	ID	Idaho	244
23	US	IL	Illinois	244
24	US	IN	Indiana	244
25	US	IA	Iowa	244
26	US	KS	Kansas	244
27	US	KY	Kentucky	244
28	US	LA	Louisiana	244
29	US	ME	Maine	244
30	US	MH	Marshall Islands	244
31	US	MD	Maryland	244
32	US	MA	Massachusetts	244
33	US	MI	Michigan	244
34	US	MN	Minnesota	244
35	US	MS	Mississippi	244
36	US	MO	Missouri	244
37	US	MT	Montana	244
38	US	NE	Nebraska	244
39	US	NV	Nevada	244
40	US	NH	New Hampshire	244
41	US	NJ	New Jersey	244
42	US	NM	New Mexico	244
43	US	NY	New York	244
44	US	NC	North Carolina	244
45	US	ND	North Dakota	244
46	US	MP	Northern Mariana Islands	244
47	US	OH	Ohio	244
48	US	OK	Oklahoma	244
49	US	OR	Oregon	244
50	US	PW	Palau	244
51	US	PA	Pennsylvania	244
52	US	PR	Puerto Rico	244
53	US	RI	Rhode Island	244
54	US	SC	South Carolina	244
55	US	SD	South Dakota	244
56	US	TN	Tennessee	244
57	US	TX	Texas	244
58	US	UT	Utah	244
59	US	VT	Vermont	244
60	US	VI	Virgin Islands	244
61	US	VA	Virginia	244
62	US	WA	Washington	244
63	US	WV	West Virginia	244
64	US	WI	Wisconsin	244
65	US	WY	Wyoming	244
66	CA	AB	Alberta	40
67	CA	BC	British Columbia	40
68	CA	MB	Manitoba	40
69	CA	NL	Newfoundland and Labrador	40
70	CA	NB	New Brunswick	40
71	CA	NS	Nova Scotia	40
72	CA	NT	Northwest Territories	40
73	CA	NU	Nunavut	40
74	CA	ON	Ontario	40
75	CA	PE	Prince Edward Island	40
76	CA	QC	Quebec	40
77	CA	SK	Saskatchewan	40
78	CA	YT	Yukon Territory	40
79	DE	NDS	Niedersachsen	88
80	DE	BAW	Baden-Württemberg	88
81	DE	BAY	Bayern	88
82	DE	BER	Berlin	88
83	DE	BRG	Brandenburg	88
84	DE	BRE	Bremen	88
85	DE	HAM	Hamburg	88
86	DE	HES	Hessen	88
87	DE	MEC	Mecklenburg-Vorpommern	88
88	DE	NRW	Nordrhein-Westfalen	88
89	DE	RHE	Rheinland-Pfalz	88
90	DE	SAR	Saarland	88
91	DE	SAS	Sachsen	88
92	DE	SAC	Sachsen-Anhalt	88
93	DE	SCN	Schleswig-Holstein	88
94	DE	THE	Thüringen	88
95	AT	WI	Wien	16
96	AT	NO	Niederösterreich	16
97	AT	OO	Oberösterreich	16
98	AT	SB	Salzburg	16
99	AT	KN	Kärnten	16
100	AT	ST	Steiermark	16
101	AT	TI	Tirol	16
102	AT	BL	Burgenland	16
103	AT	VB	Vorarlberg	16
104	CH	AG	Aargau	220
105	CH	AI	Appenzell Innerrhoden	220
106	CH	AR	Appenzell Ausserrhoden	220
107	CH	BE	Bern	220
108	CH	BL	Basel-Landschaft	220
109	CH	BS	Basel-Stadt	220
110	CH	FR	Freiburg	220
111	CH	GE	Genf	220
112	CH	GL	Glarus	220
113	CH	GR	Graubünden	220
114	CH	JU	Jura	220
115	CH	LU	Luzern	220
116	CH	NE	Neuenburg	220
117	CH	NW	Nidwalden	220
118	CH	OW	Obwalden	220
119	CH	SG	St. Gallen	220
120	CH	SH	Schaffhausen	220
121	CH	SO	Solothurn	220
122	CH	SZ	Schwyz	220
123	CH	TG	Thurgau	220
124	CH	TI	Tessin	220
125	CH	UR	Uri	220
126	CH	VD	Waadt	220
127	CH	VS	Wallis	220
128	CH	ZG	Zug	220
129	CH	ZH	Zürich	220
130	ES	A Coruсa	A Coruña	206
131	ES	Alava	Alava	206
132	ES	Albacete	Albacete	206
133	ES	Alicante	Alicante	206
134	ES	Almeria	Almeria	206
135	ES	Asturias	Asturias	206
136	ES	Avila	Avila	206
137	ES	Badajoz	Badajoz	206
138	ES	Baleares	Baleares	206
139	ES	Barcelona	Barcelona	206
140	ES	Burgos	Burgos	206
141	ES	Caceres	Caceres	206
142	ES	Cadiz	Cadiz	206
143	ES	Cantabria	Cantabria	206
144	ES	Castellon	Castellon	206
145	ES	Ceuta	Ceuta	206
146	ES	Ciudad Real	Ciudad Real	206
147	ES	Cordoba	Cordoba	206
148	ES	Cuenca	Cuenca	206
149	ES	Girona	Girona	206
150	ES	Granada	Granada	206
151	ES	Guadalajara	Guadalajara	206
152	ES	Guipuzcoa	Guipuzcoa	206
153	ES	Huelva	Huelva	206
154	ES	Huesca	Huesca	206
155	ES	Jaen	Jaen	206
156	ES	La Rioja	La Rioja	206
157	ES	Las Palmas	Las Palmas	206
158	ES	Leon	Leon	206
159	ES	Lleida	Lleida	206
160	ES	Lugo	Lugo	206
161	ES	Madrid	Madrid	206
162	ES	Malaga	Malaga	206
163	ES	Melilla	Melilla	206
164	ES	Murcia	Murcia	206
165	ES	Navarra	Navarra	206
166	ES	Ourense	Ourense	206
167	ES	Palencia	Palencia	206
168	ES	Pontevedra	Pontevedra	206
169	ES	Salamanca	Salamanca	206
170	ES	Santa Cruz de Tenerife	Santa Cruz de Tenerife	206
171	ES	Segovia	Segovia	206
172	ES	Sevilla	Sevilla	206
173	ES	Soria	Soria	206
174	ES	Tarragona	Tarragona	206
175	ES	Teruel	Teruel	206
176	ES	Toledo	Toledo	206
177	ES	Valencia	Valencia	206
178	ES	Valladolid	Valladolid	206
179	ES	Vizcaya	Vizcaya	206
180	ES	Zamora	Zamora	206
181	ES	Zaragoza	Zaragoza	206
182	FR	1	Ain	81
183	FR	2	Aisne	81
184	FR	3	Allier	81
185	FR	4	Alpes-de-Haute-Provence	81
186	FR	5	Hautes-Alpes	81
187	FR	6	Alpes-Maritimes	81
188	FR	7	Ardèche	81
189	FR	8	Ardennes	81
190	FR	9	Ariège	81
191	FR	10	Aube	81
192	FR	11	Aude	81
193	FR	12	Aveyron	81
194	FR	13	Bouches-du-Rhône	81
195	FR	14	Calvados	81
196	FR	15	Cantal	81
197	FR	16	Charente	81
198	FR	17	Charente-Maritime	81
199	FR	18	Cher	81
200	FR	19	Corrèze	81
201	FR	2A	Corse-du-Sud	81
202	FR	2B	Haute-Corse	81
203	FR	21	Côte-d'Or	81
204	FR	22	Côtes-d'Armor	81
205	FR	23	Creuse	81
206	FR	24	Dordogne	81
207	FR	25	Doubs	81
208	FR	26	Drôme	81
209	FR	27	Eure	81
210	FR	28	Eure-et-Loir	81
211	FR	29	Finistère	81
212	FR	30	Gard	81
213	FR	31	Haute-Garonne	81
214	FR	32	Gers	81
215	FR	33	Gironde	81
216	FR	34	Hérault	81
217	FR	35	Ille-et-Vilaine	81
218	FR	36	Indre	81
219	FR	37	Indre-et-Loire	81
220	FR	38	Isère	81
221	FR	39	Jura	81
222	FR	40	Landes	81
223	FR	41	Loir-et-Cher	81
224	FR	42	Loire	81
225	FR	43	Haute-Loire	81
226	FR	44	Loire-Atlantique	81
227	FR	45	Loiret	81
228	FR	46	Lot	81
229	FR	47	Lot-et-Garonne	81
230	FR	48	Lozère	81
231	FR	49	Maine-et-Loire	81
232	FR	50	Manche	81
233	FR	51	Marne	81
234	FR	52	Haute-Marne	81
235	FR	53	Mayenne	81
236	FR	54	Meurthe-et-Moselle	81
237	FR	55	Meuse	81
238	FR	56	Morbihan	81
239	FR	57	Moselle	81
240	FR	58	Nièvre	81
241	FR	59	Nord	81
242	FR	60	Oise	81
243	FR	61	Orne	81
244	FR	62	Pas-de-Calais	81
245	FR	63	Puy-de-Dôme	81
246	FR	64	Pyrénées-Atlantiques	81
247	FR	65	Hautes-Pyrénées	81
248	FR	66	Pyrénées-Orientales	81
249	FR	67	Bas-Rhin	81
250	FR	68	Haut-Rhin	81
251	FR	69	Rhône	81
252	FR	70	Haute-Saône	81
253	FR	71	Saône-et-Loire	81
254	FR	72	Sarthe	81
255	FR	73	Savoie	81
256	FR	74	Haute-Savoie	81
257	FR	75	Paris	81
258	FR	76	Seine-Maritime	81
259	FR	77	Seine-et-Marne	81
260	FR	78	Yvelines	81
261	FR	79	Deux-Sèvres	81
262	FR	80	Somme	81
263	FR	81	Tarn	81
264	FR	82	Tarn-et-Garonne	81
265	FR	83	Var	81
266	FR	84	Vaucluse	81
267	FR	85	Vendée	81
268	FR	86	Vienne	81
269	FR	87	Haute-Vienne	81
270	FR	88	Vosges	81
271	FR	89	Yonne	81
272	FR	90	Territoire-de-Belfort	81
273	FR	91	Essonne	81
274	FR	92	Hauts-de-Seine	81
275	FR	93	Seine-Saint-Denis	81
276	FR	94	Val-de-Marne	81
277	FR	95	Val-d'Oise	81
278	RO	AB	Alba	185
279	RO	AR	Arad	185
280	RO	AG	Argeş	185
281	RO	BC	Bacău	185
282	RO	BH	Bihor	185
283	RO	BN	Bistriţa-Năsăud	185
284	RO	BT	Botoşani	185
285	RO	BV	Braşov	185
286	RO	BR	Brăila	185
287	RO	B	Bucureşti	185
288	RO	BZ	Buzău	185
289	RO	CS	Caraş-Severin	185
290	RO	CL	Călăraşi	185
291	RO	CJ	Cluj	185
292	RO	CT	Constanţa	185
293	RO	CV	Covasna	185
294	RO	DB	Dâmboviţa	185
295	RO	DJ	Dolj	185
296	RO	GL	Galaţi	185
297	RO	GR	Giurgiu	185
298	RO	GJ	Gorj	185
299	RO	HR	Harghita	185
300	RO	HD	Hunedoara	185
301	RO	IL	Ialomiţa	185
302	RO	IS	Iaşi	185
303	RO	IF	Ilfov	185
304	RO	MM	Maramureş	185
305	RO	MH	Mehedinţi	185
306	RO	MS	Mureş	185
307	RO	NT	Neamţ	185
308	RO	OT	Olt	185
309	RO	PH	Prahova	185
310	RO	SM	Satu-Mare	185
311	RO	SJ	Sălaj	185
312	RO	SB	Sibiu	185
313	RO	SV	Suceava	185
314	RO	TR	Teleorman	185
315	RO	TM	Timiş	185
316	RO	TL	Tulcea	185
317	RO	VS	Vaslui	185
318	RO	VL	Vâlcea	185
319	RO	VN	Vrancea	185
320	FI	Lappi	Lappi	80
321	FI	Pohjois-Pohjanmaa	Pohjois-Pohjanmaa	80
322	FI	Kainuu	Kainuu	80
323	FI	Pohjois-Karjala	Pohjois-Karjala	80
324	FI	Pohjois-Savo	Pohjois-Savo	80
325	FI	Etelä-Savo	Etelä-Savo	80
326	FI	Etelä-Pohjanmaa	Etelä-Pohjanmaa	80
327	FI	Pohjanmaa	Pohjanmaa	80
328	FI	Pirkanmaa	Pirkanmaa	80
329	FI	Satakunta	Satakunta	80
330	FI	Keski-Pohjanmaa	Keski-Pohjanmaa	80
331	FI	Keski-Suomi	Keski-Suomi	80
332	FI	Varsinais-Suomi	Varsinais-Suomi	80
333	FI	Etelä-Karjala	Etelä-Karjala	80
334	FI	Päijät-Häme	Päijät-Häme	80
335	FI	Kanta-Häme	Kanta-Häme	80
336	FI	Uusimaa	Uusimaa	80
337	FI	Itä-Uusimaa	Itä-Uusimaa	80
338	FI	Kymenlaakso	Kymenlaakso	80
339	FI	Ahvenanmaa	Ahvenanmaa	80
340	EE	EE-37	Harjumaa	74
341	EE	EE-39	Hiiumaa	74
342	EE	EE-44	Ida-Virumaa	74
343	EE	EE-49	Jõgevamaa	74
344	EE	EE-51	Järvamaa	74
345	EE	EE-57	Läänemaa	74
346	EE	EE-59	Lääne-Virumaa	74
347	EE	EE-65	Põlvamaa	74
348	EE	EE-67	Pärnumaa	74
349	EE	EE-70	Raplamaa	74
350	EE	EE-74	Saaremaa	74
351	EE	EE-78	Tartumaa	74
352	EE	EE-82	Valgamaa	74
353	EE	EE-84	Viljandimaa	74
354	EE	EE-86	Võrumaa	74
355	LV	LV-DGV	Daugavpils	125
356	LV	LV-JEL	Jelgava	125
357	LV	Jēkabpils	Jēkabpils	125
358	LV	LV-JUR	Jūrmala	125
359	LV	LV-LPX	Liepāja	125
360	LV	LV-LE	Liepājas novads	125
361	LV	LV-REZ	Rēzekne	125
362	LV	LV-RIX	Rīga	125
363	LV	LV-RI	Rīgas novads	125
364	LV	Valmiera	Valmiera	125
365	LV	LV-VEN	Ventspils	125
366	LV	Aglonas novads	Aglonas novads	125
367	LV	LV-AI	Aizkraukles novads	125
368	LV	Aizputes novads	Aizputes novads	125
369	LV	Aknīstes novads	Aknīstes novads	125
370	LV	Alojas novads	Alojas novads	125
371	LV	Alsungas novads	Alsungas novads	125
372	LV	LV-AL	Alūksnes novads	125
373	LV	Amatas novads	Amatas novads	125
374	LV	Apes novads	Apes novads	125
375	LV	Auces novads	Auces novads	125
376	LV	Babītes novads	Babītes novads	125
377	LV	Baldones novads	Baldones novads	125
378	LV	Baltinavas novads	Baltinavas novads	125
379	LV	LV-BL	Balvu novads	125
380	LV	LV-BU	Bauskas novads	125
381	LV	Beverīnas novads	Beverīnas novads	125
382	LV	Brocēnu novads	Brocēnu novads	125
383	LV	Burtnieku novads	Burtnieku novads	125
384	LV	Carnikavas novads	Carnikavas novads	125
385	LV	Cesvaines novads	Cesvaines novads	125
386	LV	Ciblas novads	Ciblas novads	125
387	LV	LV-CE	Cēsu novads	125
388	LV	Dagdas novads	Dagdas novads	125
389	LV	LV-DA	Daugavpils novads	125
390	LV	LV-DO	Dobeles novads	125
391	LV	Dundagas novads	Dundagas novads	125
392	LV	Durbes novads	Durbes novads	125
393	LV	Engures novads	Engures novads	125
394	LV	Garkalnes novads	Garkalnes novads	125
395	LV	Grobiņas novads	Grobiņas novads	125
396	LV	LV-GU	Gulbenes novads	125
397	LV	Iecavas novads	Iecavas novads	125
398	LV	Ikšķiles novads	Ikšķiles novads	125
399	LV	Ilūkstes novads	Ilūkstes novads	125
400	LV	Inčukalna novads	Inčukalna novads	125
401	LV	Jaunjelgavas novads	Jaunjelgavas novads	125
402	LV	Jaunpiebalgas novads	Jaunpiebalgas novads	125
403	LV	Jaunpils novads	Jaunpils novads	125
404	LV	LV-JL	Jelgavas novads	125
405	LV	LV-JK	Jēkabpils novads	125
406	LV	Kandavas novads	Kandavas novads	125
407	LV	Kokneses novads	Kokneses novads	125
408	LV	Krimuldas novads	Krimuldas novads	125
409	LV	Krustpils novads	Krustpils novads	125
410	LV	LV-KR	Krāslavas novads	125
411	LV	LV-KU	Kuldīgas novads	125
412	LV	Kārsavas novads	Kārsavas novads	125
413	LV	Lielvārdes novads	Lielvārdes novads	125
414	LV	LV-LM	Limbažu novads	125
415	LV	Lubānas novads	Lubānas novads	125
416	LV	LV-LU	Ludzas novads	125
417	LV	Līgatnes novads	Līgatnes novads	125
418	LV	Līvānu novads	Līvānu novads	125
419	LV	LV-MA	Madonas novads	125
420	LV	Mazsalacas novads	Mazsalacas novads	125
421	LV	Mālpils novads	Mālpils novads	125
422	LV	Mārupes novads	Mārupes novads	125
423	LV	Naukšēnu novads	Naukšēnu novads	125
424	LV	Neretas novads	Neretas novads	125
425	LV	Nīcas novads	Nīcas novads	125
426	LV	LV-OG	Ogres novads	125
427	LV	Olaines novads	Olaines novads	125
428	LV	Ozolnieku novads	Ozolnieku novads	125
429	LV	LV-PR	Preiļu novads	125
430	LV	Priekules novads	Priekules novads	125
431	LV	Priekuļu novads	Priekuļu novads	125
432	LV	Pārgaujas novads	Pārgaujas novads	125
433	LV	Pāvilostas novads	Pāvilostas novads	125
434	LV	Pļaviņu novads	Pļaviņu novads	125
435	LV	Raunas novads	Raunas novads	125
436	LV	Riebiņu novads	Riebiņu novads	125
437	LV	Rojas novads	Rojas novads	125
438	LV	Ropažu novads	Ropažu novads	125
439	LV	Rucavas novads	Rucavas novads	125
440	LV	Rugāju novads	Rugāju novads	125
441	LV	Rundāles novads	Rundāles novads	125
442	LV	LV-RE	Rēzeknes novads	125
443	LV	Rūjienas novads	Rūjienas novads	125
444	LV	Salacgrīvas novads	Salacgrīvas novads	125
445	LV	Salas novads	Salas novads	125
446	LV	Salaspils novads	Salaspils novads	125
447	LV	LV-SA	Saldus novads	125
448	LV	Saulkrastu novads	Saulkrastu novads	125
449	LV	Siguldas novads	Siguldas novads	125
450	LV	Skrundas novads	Skrundas novads	125
451	LV	Skrīveru novads	Skrīveru novads	125
452	LV	Smiltenes novads	Smiltenes novads	125
453	LV	Stopiņu novads	Stopiņu novads	125
454	LV	Strenču novads	Strenču novads	125
455	LV	Sējas novads	Sējas novads	125
456	LV	LV-TA	Talsu novads	125
457	LV	LV-TU	Tukuma novads	125
458	LV	Tērvetes novads	Tērvetes novads	125
459	LV	Vaiņodes novads	Vaiņodes novads	125
460	LV	LV-VK	Valkas novads	125
461	LV	LV-VM	Valmieras novads	125
462	LV	Varakļānu novads	Varakļānu novads	125
463	LV	Vecpiebalgas novads	Vecpiebalgas novads	125
464	LV	Vecumnieku novads	Vecumnieku novads	125
465	LV	LV-VE	Ventspils novads	125
466	LV	Viesītes novads	Viesītes novads	125
467	LV	Viļakas novads	Viļakas novads	125
468	LV	Viļānu novads	Viļānu novads	125
469	LV	Vārkavas novads	Vārkavas novads	125
470	LV	Zilupes novads	Zilupes novads	125
471	LV	Ādažu novads	Ādažu novads	125
472	LV	Ērgļu novads	Ērgļu novads	125
473	LV	Ķeguma novads	Ķeguma novads	125
474	LV	Ķekavas novads	Ķekavas novads	125
475	LT	LT-AL	Alytaus Apskritis	131
476	LT	LT-KU	Kauno Apskritis	131
477	LT	LT-KL	Klaipėdos Apskritis	131
478	LT	LT-MR	Marijampolės Apskritis	131
479	LT	LT-PN	Panevėžio Apskritis	131
480	LT	LT-SA	Šiaulių Apskritis	131
481	LT	LT-TA	Tauragės Apskritis	131
482	LT	LT-TE	Telšių Apskritis	131
483	LT	LT-UT	Utenos Apskritis	131
484	LT	LT-VL	Vilniaus Apskritis	131
485	BR	AC	Acre	31
486	BR	AL	Alagoas	31
487	BR	AP	Amapá	31
488	BR	AM	Amazonas	31
489	BR	BA	Bahia	31
490	BR	CE	Ceará	31
491	BR	ES	Espírito Santo	31
492	BR	GO	Goiás	31
493	BR	MA	Maranhão	31
494	BR	MT	Mato Grosso	31
495	BR	MS	Mato Grosso do Sul	31
496	BR	MG	Minas Gerais	31
497	BR	PA	Pará	31
498	BR	PB	Paraíba	31
499	BR	PR	Paraná	31
500	BR	PE	Pernambuco	31
501	BR	PI	Piauí	31
502	BR	RJ	Rio de Janeiro	31
503	BR	RN	Rio Grande do Norte	31
504	BR	RS	Rio Grande do Sul	31
505	BR	RO	Rondônia	31
506	BR	RR	Roraima	31
507	BR	SC	Santa Catarina	31
508	BR	SP	São Paulo	31
509	BR	SE	Sergipe	31
510	BR	TO	Tocantins	31
511	BR	DF	Distrito Federal	31
512	HR	HR-01	Zagrebačka županija	59
513	HR	HR-02	Krapinsko-zagorska županija	59
514	HR	HR-03	Sisačko-moslavačka županija	59
515	HR	HR-04	Karlovačka županija	59
516	HR	HR-05	Varaždinska županija	59
517	HR	HR-06	Koprivničko-križevačka županija	59
518	HR	HR-07	Bjelovarsko-bilogorska županija	59
519	HR	HR-08	Primorsko-goranska županija	59
520	HR	HR-09	Ličko-senjska županija	59
521	HR	HR-10	Virovitičko-podravska županija	59
522	HR	HR-11	Požeško-slavonska županija	59
523	HR	HR-12	Brodsko-posavska županija	59
524	HR	HR-13	Zadarska županija	59
525	HR	HR-14	Osječko-baranjska županija	59
526	HR	HR-15	Šibensko-kninska županija	59
527	HR	HR-16	Vukovarsko-srijemska županija	59
528	HR	HR-17	Splitsko-dalmatinska županija	59
529	HR	HR-18	Istarska županija	59
530	HR	HR-19	Dubrovačko-neretvanska županija	59
531	HR	HR-20	Međimurska županija	59
532	HR	HR-21	Grad Zagreb	59
533	IN	AN	Andaman and Nicobar Islands	106
534	IN	AP	Andhra Pradesh	106
535	IN	AR	Arunachal Pradesh	106
536	IN	AS	Assam	106
537	IN	BR	Bihar	106
538	IN	CH	Chandigarh	106
539	IN	CT	Chhattisgarh	106
540	IN	DN	Dadra and Nagar Haveli	106
541	IN	DD	Daman and Diu	106
542	IN	DL	Delhi	106
543	IN	GA	Goa	106
544	IN	GJ	Gujarat	106
545	IN	HR	Haryana	106
546	IN	HP	Himachal Pradesh	106
547	IN	JK	Jammu and Kashmir	106
548	IN	JH	Jharkhand	106
549	IN	KA	Karnataka	106
550	IN	KL	Kerala	106
551	IN	LD	Lakshadweep	106
552	IN	MP	Madhya Pradesh	106
553	IN	MH	Maharashtra	106
554	IN	MN	Manipur	106
555	IN	ML	Meghalaya	106
556	IN	MZ	Mizoram	106
557	IN	NL	Nagaland	106
558	IN	OR	Odisha	106
559	IN	PY	Puducherry	106
560	IN	PB	Punjab	106
561	IN	RJ	Rajasthan	106
562	IN	SK	Sikkim	106
563	IN	TN	Tamil Nadu	106
564	IN	TG	Telangana	106
565	IN	TR	Tripura	106
566	IN	UP	Uttar Pradesh	106
567	IN	UT	Uttarakhand	106
568	IN	WB	West Bengal	106
\.


--
-- TOC entry 5696 (class 0 OID 37424)
-- Dependencies: 301
-- Data for Name: datagrid_saved_filters; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.datagrid_saved_filters (id, user_id, name, src, applied, created_at, updated_at) FROM stdin;
\.


--
-- TOC entry 5683 (class 0 OID 37310)
-- Dependencies: 288
-- Data for Name: email_attachments; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.email_attachments (id, name, path, size, content_type, content_id, email_id, created_at, updated_at) FROM stdin;
\.


--
-- TOC entry 5684 (class 0 OID 37327)
-- Dependencies: 289
-- Data for Name: email_tags; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.email_tags (tag_id, email_id) FROM stdin;
\.


--
-- TOC entry 5679 (class 0 OID 37264)
-- Dependencies: 284
-- Data for Name: email_templates; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.email_templates (id, name, subject, content, created_at, updated_at) FROM stdin;
1	Activity created	Activity created: {%activities.title%}	<p style="font-size: 16px; color: #5e5e5e;">You have a new activity, please find the details bellow:</p>\n<p><strong style="font-size: 16px;">Details</strong></p>\n<table style="height: 97px; width: 952px;">\n    <tbody>\n        <tr>\n            <td style="width: 116.953px; color: #546e7a; font-size: 16px;">Title</td>\n            <td style="width: 770.047px; font-size: 16px;">{%activities.title%}</td>\n        </tr>\n        <tr>\n            <td style="width: 116.953px; color: #546e7a; font-size: 16px;">Type</td>\n            <td style="width: 770.047px; font-size: 16px;">{%activities.type%}</td>\n        </tr>\n        <tr>\n            <td style="width: 116.953px; color: #546e7a; font-size: 16px;">Date</td>\n            <td style="width: 770.047px; font-size: 16px;">{%activities.schedule_from%} to&nbsp;{%activities.schedule_to%}</td>\n        </tr>\n        <tr>\n            <td style="width: 116.953px; color: #546e7a; font-size: 16px; vertical-align: text-top;">Participants</td>\n            <td style="width: 770.047px; font-size: 16px;">{%activities.participants%}</td>\n        </tr>\n    </tbody>\n</table>	2026-09-16 04:49:02+05:30	2026-09-16 04:49:02+05:30
2	Activity modified	Activity modified: {%activities.title%}	<p style="font-size: 16px; color: #5e5e5e;">You have a new activity modified, please find the details bellow:</p>\n<p><strong style="font-size: 16px;">Details</strong></p>\n<table style="height: 97px; width: 952px;">\n    <tbody>\n        <tr>\n            <td style="width: 116.953px; color: #546e7a; font-size: 16px;">Title</td>\n            <td style="width: 770.047px; font-size: 16px;">{%activities.title%}</td>\n        </tr>\n        <tr>\n            <td style="width: 116.953px; color: #546e7a; font-size: 16px;">Type</td>\n            <td style="width: 770.047px; font-size: 16px;">{%activities.type%}</td>\n        </tr>\n        <tr>\n            <td style="width: 116.953px; color: #546e7a; font-size: 16px;">Date</td>\n            <td style="width: 770.047px; font-size: 16px;">{%activities.schedule_from%} to&nbsp;{%activities.schedule_to%}</td>\n        </tr>\n        <tr>\n            <td style="width: 116.953px; color: #546e7a; font-size: 16px; vertical-align: text-top;">Participants</td>\n            <td style="width: 770.047px; font-size: 16px;">{%activities.participants%}</td>\n        </tr>\n    </tbody>\n</table>	2026-09-16 04:49:02+05:30	2026-09-16 04:49:02+05:30
\.


--
-- TOC entry 5681 (class 0 OID 37275)
-- Dependencies: 286
-- Data for Name: emails; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.emails (id, subject, source, user_type, name, reply, is_read, folders, "from", sender, reply_to, cc, bcc, unique_id, message_id, reference_ids, person_id, lead_id, created_at, updated_at, parent_id) FROM stdin;
\.


--
-- TOC entry 5686 (class 0 OID 37343)
-- Dependencies: 291
-- Data for Name: failed_jobs; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.failed_jobs (id, uuid, connection, queue, payload, exception, failed_at) FROM stdin;
\.


--
-- TOC entry 5688 (class 0 OID 37355)
-- Dependencies: 293
-- Data for Name: google_contact_accounts; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.google_contact_accounts (id, user_id, google_email, access_token, refresh_token, expires_at, scopes, created_at, updated_at) FROM stdin;
\.


--
-- TOC entry 5618 (class 0 OID 36663)
-- Dependencies: 223
-- Data for Name: groups; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.groups (id, name, description, created_at, updated_at) FROM stdin;
\.


--
-- TOC entry 5700 (class 0 OID 37451)
-- Dependencies: 305
-- Data for Name: import_batches; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.import_batches (id, state, data, summary, import_id) FROM stdin;
\.


--
-- TOC entry 5698 (class 0 OID 37435)
-- Dependencies: 303
-- Data for Name: imports; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.imports (id, state, process_in_queue, type, action, validation_strategy, allowed_errors, processed_rows_count, invalid_rows_count, errors_count, errors, field_separator, file_path, error_file_path, summary, started_at, completed_at, created_at, updated_at) FROM stdin;
\.


--
-- TOC entry 5701 (class 0 OID 37466)
-- Dependencies: 306
-- Data for Name: job_batches; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.job_batches (id, name, total_jobs, pending_jobs, failed_jobs, failed_job_ids, options, cancelled_at, created_at, finished_at) FROM stdin;
\.


--
-- TOC entry 5703 (class 0 OID 37474)
-- Dependencies: 308
-- Data for Name: jobs; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.jobs (id, queue, payload, attempts, reserved_at, available_at, created_at) FROM stdin;
\.


--
-- TOC entry 5665 (class 0 OID 37108)
-- Dependencies: 270
-- Data for Name: lead_activities; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.lead_activities (activity_id, lead_id) FROM stdin;
\.


--
-- TOC entry 5644 (class 0 OID 36852)
-- Dependencies: 249
-- Data for Name: lead_pipeline_stages; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.lead_pipeline_stages (id, code, name, probability, sort_order, lead_pipeline_id) FROM stdin;
1	new	New	100	1	1
2	follow-up	Follow Up	100	2	1
3	prospect	Prospect	100	3	1
4	negotiation	Negotiation	100	4	1
5	won	Won	100	5	1
6	lost	Lost	0	6	1
\.


--
-- TOC entry 5642 (class 0 OID 36841)
-- Dependencies: 247
-- Data for Name: lead_pipelines; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.lead_pipelines (id, name, is_default, rotten_days, created_at, updated_at) FROM stdin;
1	Default Pipeline	t	30	2026-09-16 04:49:02+05:30	2026-09-16 04:49:02+05:30
\.


--
-- TOC entry 5653 (class 0 OID 36962)
-- Dependencies: 258
-- Data for Name: lead_products; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.lead_products (id, quantity, price, amount, lead_id, product_id, created_at, updated_at) FROM stdin;
\.


--
-- TOC entry 5658 (class 0 OID 37035)
-- Dependencies: 263
-- Data for Name: lead_quotes; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.lead_quotes (quote_id, lead_id) FROM stdin;
\.


--
-- TOC entry 5638 (class 0 OID 36827)
-- Dependencies: 243
-- Data for Name: lead_sources; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.lead_sources (id, name, created_at, updated_at) FROM stdin;
1	Email	2026-09-16 04:49:02+05:30	2026-09-16 04:49:02+05:30
2	Web	2026-09-16 04:49:02+05:30	2026-09-16 04:49:02+05:30
3	Web Form	2026-09-16 04:49:02+05:30	2026-09-16 04:49:02+05:30
4	Phone	2026-09-16 04:49:02+05:30	2026-09-16 04:49:02+05:30
5	Direct	2026-09-16 04:49:02+05:30	2026-09-16 04:49:02+05:30
\.


--
-- TOC entry 5646 (class 0 OID 36875)
-- Dependencies: 251
-- Data for Name: lead_stages; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.lead_stages (id, code, name, is_user_defined, created_at, updated_at) FROM stdin;
\.


--
-- TOC entry 5651 (class 0 OID 36946)
-- Dependencies: 256
-- Data for Name: lead_tags; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.lead_tags (tag_id, lead_id) FROM stdin;
\.


--
-- TOC entry 5640 (class 0 OID 36834)
-- Dependencies: 245
-- Data for Name: lead_types; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.lead_types (id, name, created_at, updated_at) FROM stdin;
1	New Business	2026-09-16 04:49:02+05:30	2026-09-16 04:49:02+05:30
2	Existing Business	2026-09-16 04:49:02+05:30	2026-09-16 04:49:02+05:30
\.


--
-- TOC entry 5648 (class 0 OID 36885)
-- Dependencies: 253
-- Data for Name: leads; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.leads (id, title, description, lead_value, status, lost_reason, closed_at, user_id, person_id, lead_source_id, lead_type_id, lead_pipeline_id, lead_pipeline_stage_id, created_at, updated_at, expected_close_date) FROM stdin;
\.


--
-- TOC entry 5707 (class 0 OID 37493)
-- Dependencies: 312
-- Data for Name: marketing_campaigns; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.marketing_campaigns (id, name, subject, status, type, mail_to, spooling, marketing_template_id, marketing_event_id, created_at, updated_at) FROM stdin;
\.


--
-- TOC entry 5705 (class 0 OID 37484)
-- Dependencies: 310
-- Data for Name: marketing_events; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.marketing_events (id, name, description, date, created_at, updated_at) FROM stdin;
\.


--
-- TOC entry 5709 (class 0 OID 37516)
-- Dependencies: 314
-- Data for Name: migrations; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.migrations (id, migration, batch) FROM stdin;
1	2019_08_19_000000_create_failed_jobs_table	1
2	2019_12_14_000001_create_personal_access_tokens_table	1
3	2021_03_12_060658_create_core_config_table	1
4	2021_03_12_074578_create_groups_table	1
5	2021_03_12_074597_create_roles_table	1
6	2021_03_12_074857_create_users_table	1
7	2021_03_12_074867_create_user_groups_table	1
8	2021_03_12_074957_create_user_password_resets_table	1
9	2021_04_02_080709_create_attributes_table	1
10	2021_04_02_080837_create_attribute_options_table	1
11	2021_04_06_122751_create_attribute_values_table	1
12	2021_04_09_051326_create_organizations_table	1
13	2021_04_09_065617_create_persons_table	1
14	2021_04_09_065617_create_products_table	1
15	2021_04_12_173232_create_countries_table	1
16	2021_04_12_173344_create_country_states_table	1
17	2021_04_21_172825_create_lead_sources_table	1
18	2021_04_21_172847_create_lead_types_table	1
19	2021_04_22_153258_create_lead_stages_table	1
20	2021_04_22_155706_create_lead_pipelines_table	1
21	2021_04_22_155838_create_lead_pipeline_stages_table	1
22	2021_04_22_164215_create_leads_table	1
23	2021_04_22_171805_create_lead_products_table	1
24	2021_05_12_150329_create_activities_table	1
25	2021_05_12_150329_create_lead_activities_table	1
26	2021_05_15_151855_create_activity_files_table	1
27	2021_05_20_141230_create_tags_table	1
28	2021_05_20_141240_create_lead_tags_table	1
29	2021_05_24_075618_create_emails_table	1
30	2021_05_25_072700_create_email_attachments_table	1
31	2021_06_07_162808_add_lead_view_permission_column_in_users_table	1
32	2021_07_01_230345_create_quotes_table	1
33	2021_07_01_231317_create_quote_items_table	1
34	2021_07_02_201822_create_lead_quotes_table	1
35	2021_07_28_142453_create_activity_participants_table	1
36	2021_08_26_133538_create_workflows_table	1
37	2021_09_03_172713_create_email_templates_table	1
38	2021_09_22_194103_add_unique_index_to_name_in_organizations_table	1
39	2021_09_22_194622_add_unique_index_to_name_in_groups_table	1
40	2021_09_23_221138_add_column_expected_close_date_in_leads_table	1
41	2021_09_30_135857_add_column_rotten_days_in_lead_pipelines_table	1
42	2021_09_30_154222_alter_lead_pipeline_stages_table	1
43	2021_09_30_161722_alter_leads_table	1
44	2021_09_30_183825_change_user_id_to_nullable_in_leads_table	1
45	2021_10_02_170105_insert_expected_closed_date_column_in_attributes_table	1
46	2021_11_11_180804_change_lead_pipeline_stage_id_constraint_in_leads_table	1
47	2021_11_12_171510_add_image_column_in_users_table	1
48	2021_11_17_190943_add_location_column_in_activities_table	1
49	2021_12_14_213049_create_web_forms_table	1
50	2021_12_14_214923_create_web_form_attributes_table	1
51	2024_01_11_154640_create_imports_table	1
52	2024_01_11_154741_create_import_batches_table	1
53	2024_05_10_152848_create_saved_filters_table	1
54	2024_06_21_160707_create_warehouses_table	1
55	2024_06_21_160735_create_warehouse_locations_table	1
56	2024_06_24_174241_insert_warehouse_attributes_in_attributes_table	1
57	2024_06_28_154009_create_product_inventories_table	1
58	2024_07_24_150821_create_webhooks_table	1
59	2024_07_31_092951_add_job_title_in_persons_table	1
60	2024_07_31_093603_add_organization_sales_owner_attribute_in_attributes_table	1
61	2024_07_31_093605_add_person_job_title_attribute_in_attributes_table	1
62	2024_07_31_093605_add_person_sales_owner_attribute_in_attributes_table	1
63	2024_08_06_145943_create_person_tags_table	1
64	2024_08_06_161212_create_person_activities_table	1
65	2024_08_10_100329_create_warehouse_activities_table	1
66	2024_08_10_100340_create_warehouse_tags_table	1
67	2024_08_10_150329_create_product_activities_table	1
68	2024_08_10_150340_create_product_tags_table	1
69	2024_08_14_102116_add_user_id_column_in_persons_table	1
70	2024_08_14_102136_add_user_id_column_in_organizations_table	1
71	2024_08_21_153011_add_leads_stage_and_pipeline_attributes	1
72	2024_08_27_091619_create_email_tags_table	1
73	2024_09_06_065808_alter_product_inventories_table	1
74	2024_09_09_094040_create_job_batches_table	1
75	2024_09_09_094042_create_jobs_table	1
76	2024_09_09_112201_add_unique_id_to_person_table	1
77	2024_10_29_044744_create_marketing_events_table	1
78	2024_11_04_122500_create_marketing_campaigns_table	1
79	2024_11_29_120302_modify_foreign_keys_in_leads_table	1
80	2025_01_17_151632_alter_activities_table	1
81	2025_01_29_133500_update_text_column_type_in_core_config_table	1
82	2025_03_19_132236_update_organization_id_column_in_persons_table	1
83	2025_07_01_133612_alter_lead_pipelines_table	1
84	2025_07_02_191710_alter_attribute_values_table	1
85	2025_07_09_133553_alter_email_templates_table	1
86	2026_05_29_000000_change_description_to_text_in_quotes_table	1
87	2026_06_10_000000_make_value_nullable_in_core_config_table	1
88	2026_07_09_000000_add_lead_pipeline_id_to_web_forms_table	1
89	2026_07_30_000001_create_google_contact_accounts_table	1
90	2026_07_31_000001_create_contact_export_batches_table	1
91	2026_07_31_000002_create_contact_export_batch_items_table	1
92	2026_08_06_000000_add_created_by_column_in_users_table	1
93	2026_08_06_000001_add_created_by_column_in_roles_table	1
\.


--
-- TOC entry 5626 (class 0 OID 36718)
-- Dependencies: 231
-- Data for Name: organizations; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.organizations (id, name, address, created_at, updated_at, user_id) FROM stdin;
1	test organization	{"city": "nashik", "state": "MH", "address": "Test address", "country": "IN", "postcode": null}	2026-09-17 10:25:24+05:30	2026-09-17 10:25:24+05:30	1
\.


--
-- TOC entry 5666 (class 0 OID 37123)
-- Dependencies: 271
-- Data for Name: person_activities; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.person_activities (activity_id, person_id) FROM stdin;
\.


--
-- TOC entry 5667 (class 0 OID 37138)
-- Dependencies: 272
-- Data for Name: person_tags; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.person_tags (tag_id, person_id) FROM stdin;
\.


--
-- TOC entry 5711 (class 0 OID 37523)
-- Dependencies: 316
-- Data for Name: personal_access_tokens; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.personal_access_tokens (id, tokenable_type, tokenable_id, name, token, abilities, last_used_at, expires_at, created_at, updated_at) FROM stdin;
\.


--
-- TOC entry 5628 (class 0 OID 36735)
-- Dependencies: 233
-- Data for Name: persons; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.persons (id, name, emails, contact_numbers, organization_id, created_at, updated_at, job_title, user_id, unique_id) FROM stdin;
\.


--
-- TOC entry 5668 (class 0 OID 37153)
-- Dependencies: 273
-- Data for Name: product_activities; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.product_activities (activity_id, product_id) FROM stdin;
\.


--
-- TOC entry 5675 (class 0 OID 37207)
-- Dependencies: 280
-- Data for Name: product_inventories; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.product_inventories (id, in_stock, allocated, product_id, warehouse_id, warehouse_location_id, created_at, updated_at) FROM stdin;
\.


--
-- TOC entry 5669 (class 0 OID 37168)
-- Dependencies: 274
-- Data for Name: product_tags; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.product_tags (tag_id, product_id) FROM stdin;
\.


--
-- TOC entry 5630 (class 0 OID 36760)
-- Dependencies: 235
-- Data for Name: products; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.products (id, sku, name, description, quantity, price, created_at, updated_at) FROM stdin;
2	btb	test		25	100.0000	2026-09-16 12:45:53+05:30	2026-09-16 12:45:53+05:30
\.


--
-- TOC entry 5657 (class 0 OID 37011)
-- Dependencies: 262
-- Data for Name: quote_items; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.quote_items (id, sku, name, quantity, price, coupon_code, discount_percent, discount_amount, tax_percent, tax_amount, total, product_id, quote_id, created_at, updated_at) FROM stdin;
\.


--
-- TOC entry 5655 (class 0 OID 36984)
-- Dependencies: 260
-- Data for Name: quotes; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.quotes (id, subject, description, billing_address, shipping_address, discount_percent, discount_amount, tax_amount, adjustment_amount, sub_total, grand_total, expired_at, person_id, user_id, created_at, updated_at) FROM stdin;
\.


--
-- TOC entry 5614 (class 0 OID 36622)
-- Dependencies: 219
-- Data for Name: roles; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.roles (id, name, description, permission_type, permissions, created_by, created_at, updated_at) FROM stdin;
1	Administrator	Administrator Role	all	\N	\N	\N	\N
2	test		custom	[]	\N	2026-09-17 06:49:07+05:30	2026-09-17 06:49:07+05:30
3	test		custom	[]	\N	2026-09-17 07:03:25+05:30	2026-09-17 07:03:25+05:30
\.


--
-- TOC entry 5650 (class 0 OID 36931)
-- Dependencies: 255
-- Data for Name: tags; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.tags (id, name, color, user_id, created_at, updated_at) FROM stdin;
\.


--
-- TOC entry 5619 (class 0 OID 36674)
-- Dependencies: 224
-- Data for Name: user_groups; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.user_groups (group_id, user_id) FROM stdin;
\.


--
-- TOC entry 5620 (class 0 OID 36687)
-- Dependencies: 225
-- Data for Name: user_password_resets; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.user_password_resets (email, token, created_at) FROM stdin;
\.


--
-- TOC entry 5616 (class 0 OID 36632)
-- Dependencies: 221
-- Data for Name: users; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.users (id, name, email, password, status, view_permission, role_id, created_by, remember_token, created_at, updated_at, image) FROM stdin;
1	Example Admin	admin@example.com	$2y$10$sj2QlpGj5iwmjbEwjULXiez364CqDUf72TFAgpQf00COpb2l88LsW	t	global	1	\N	\N	2026-09-16 04:49:02+05:30	2026-09-16 04:49:02+05:30	\N
\.


--
-- TOC entry 5676 (class 0 OID 37233)
-- Dependencies: 281
-- Data for Name: warehouse_activities; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.warehouse_activities (activity_id, warehouse_id) FROM stdin;
\.


--
-- TOC entry 5673 (class 0 OID 37193)
-- Dependencies: 278
-- Data for Name: warehouse_locations; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.warehouse_locations (id, name, warehouse_id, created_at, updated_at) FROM stdin;
\.


--
-- TOC entry 5677 (class 0 OID 37248)
-- Dependencies: 282
-- Data for Name: warehouse_tags; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.warehouse_tags (tag_id, warehouse_id) FROM stdin;
\.


--
-- TOC entry 5671 (class 0 OID 37184)
-- Dependencies: 276
-- Data for Name: warehouses; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.warehouses (id, name, description, contact_name, contact_emails, contact_numbers, contact_address, created_at, updated_at) FROM stdin;
\.


--
-- TOC entry 5715 (class 0 OID 37558)
-- Dependencies: 320
-- Data for Name: web_form_attributes; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.web_form_attributes (id, name, placeholder, is_required, is_hidden, sort_order, attribute_id, web_form_id) FROM stdin;
\.


--
-- TOC entry 5713 (class 0 OID 37535)
-- Dependencies: 318
-- Data for Name: web_forms; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.web_forms (id, form_id, title, description, submit_button_label, submit_success_action, submit_success_content, create_lead, lead_pipeline_id, background_color, form_background_color, form_title_color, form_submit_button_color, attribute_label_color, created_at, updated_at) FROM stdin;
\.


--
-- TOC entry 5717 (class 0 OID 37583)
-- Dependencies: 322
-- Data for Name: webhooks; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.webhooks (id, name, entity_type, description, method, end_point, query_params, headers, payload_type, raw_payload_type, payload, created_at, updated_at) FROM stdin;
\.


--
-- TOC entry 5719 (class 0 OID 37593)
-- Dependencies: 324
-- Data for Name: workflows; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.workflows (id, name, description, entity_type, event, condition_type, conditions, actions, created_at, updated_at) FROM stdin;
1	Emails to participants after activity creation	Emails to participants after activity creation	activities	activity.create.after	and	[{"value": ["call", "meeting", "lunch"], "operator": "{}", "attribute": "type", "attribute_type": "multiselect"}]	[{"id": "send_email_to_participants", "value": "1"}]	2026-09-16 04:49:02+05:30	2026-09-16 04:49:02+05:30
2	Emails to participants after activity updation	Emails to participants after activity updation	activities	activity.update.after	and	[{"value": ["call", "meeting", "lunch"], "operator": "{}", "attribute": "type", "attribute_type": "multiselect"}]	[{"id": "send_email_to_participants", "value": "2"}]	2026-09-16 04:49:02+05:30	2026-09-16 04:49:02+05:30
\.


--
-- TOC entry 5773 (class 0 OID 0)
-- Dependencies: 264
-- Name: activities_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.activities_id_seq', 11, true);


--
-- TOC entry 5774 (class 0 OID 0)
-- Dependencies: 266
-- Name: activity_files_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.activity_files_id_seq', 1, false);


--
-- TOC entry 5775 (class 0 OID 0)
-- Dependencies: 268
-- Name: activity_participants_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.activity_participants_id_seq', 1, false);


--
-- TOC entry 5776 (class 0 OID 0)
-- Dependencies: 238
-- Name: attribute_options_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.attribute_options_id_seq', 1, false);


--
-- TOC entry 5777 (class 0 OID 0)
-- Dependencies: 240
-- Name: attribute_values_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.attribute_values_id_seq', 13, true);


--
-- TOC entry 5778 (class 0 OID 0)
-- Dependencies: 236
-- Name: attributes_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.attributes_id_seq', 60, true);


--
-- TOC entry 5779 (class 0 OID 0)
-- Dependencies: 296
-- Name: contact_export_batch_items_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.contact_export_batch_items_id_seq', 1, false);


--
-- TOC entry 5780 (class 0 OID 0)
-- Dependencies: 294
-- Name: contact_export_batches_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.contact_export_batches_id_seq', 1, false);


--
-- TOC entry 5781 (class 0 OID 0)
-- Dependencies: 298
-- Name: core_config_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.core_config_id_seq', 1, true);


--
-- TOC entry 5782 (class 0 OID 0)
-- Dependencies: 226
-- Name: countries_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.countries_id_seq', 255, true);


--
-- TOC entry 5783 (class 0 OID 0)
-- Dependencies: 228
-- Name: country_states_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.country_states_id_seq', 568, true);


--
-- TOC entry 5784 (class 0 OID 0)
-- Dependencies: 300
-- Name: datagrid_saved_filters_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.datagrid_saved_filters_id_seq', 1, false);


--
-- TOC entry 5785 (class 0 OID 0)
-- Dependencies: 287
-- Name: email_attachments_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.email_attachments_id_seq', 1, false);


--
-- TOC entry 5786 (class 0 OID 0)
-- Dependencies: 283
-- Name: email_templates_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.email_templates_id_seq', 2, true);


--
-- TOC entry 5787 (class 0 OID 0)
-- Dependencies: 285
-- Name: emails_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.emails_id_seq', 1, false);


--
-- TOC entry 5788 (class 0 OID 0)
-- Dependencies: 290
-- Name: failed_jobs_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.failed_jobs_id_seq', 1, false);


--
-- TOC entry 5789 (class 0 OID 0)
-- Dependencies: 292
-- Name: google_contact_accounts_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.google_contact_accounts_id_seq', 1, false);


--
-- TOC entry 5790 (class 0 OID 0)
-- Dependencies: 222
-- Name: groups_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.groups_id_seq', 1, false);


--
-- TOC entry 5791 (class 0 OID 0)
-- Dependencies: 304
-- Name: import_batches_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.import_batches_id_seq', 1, false);


--
-- TOC entry 5792 (class 0 OID 0)
-- Dependencies: 302
-- Name: imports_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.imports_id_seq', 1, false);


--
-- TOC entry 5793 (class 0 OID 0)
-- Dependencies: 307
-- Name: jobs_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.jobs_id_seq', 1, false);


--
-- TOC entry 5794 (class 0 OID 0)
-- Dependencies: 248
-- Name: lead_pipeline_stages_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.lead_pipeline_stages_id_seq', 6, true);


--
-- TOC entry 5795 (class 0 OID 0)
-- Dependencies: 246
-- Name: lead_pipelines_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.lead_pipelines_id_seq', 1, true);


--
-- TOC entry 5796 (class 0 OID 0)
-- Dependencies: 257
-- Name: lead_products_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.lead_products_id_seq', 1, false);


--
-- TOC entry 5797 (class 0 OID 0)
-- Dependencies: 242
-- Name: lead_sources_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.lead_sources_id_seq', 5, true);


--
-- TOC entry 5798 (class 0 OID 0)
-- Dependencies: 250
-- Name: lead_stages_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.lead_stages_id_seq', 1, false);


--
-- TOC entry 5799 (class 0 OID 0)
-- Dependencies: 244
-- Name: lead_types_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.lead_types_id_seq', 2, true);


--
-- TOC entry 5800 (class 0 OID 0)
-- Dependencies: 252
-- Name: leads_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.leads_id_seq', 1, false);


--
-- TOC entry 5801 (class 0 OID 0)
-- Dependencies: 311
-- Name: marketing_campaigns_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.marketing_campaigns_id_seq', 1, false);


--
-- TOC entry 5802 (class 0 OID 0)
-- Dependencies: 309
-- Name: marketing_events_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.marketing_events_id_seq', 1, false);


--
-- TOC entry 5803 (class 0 OID 0)
-- Dependencies: 313
-- Name: migrations_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.migrations_id_seq', 93, true);


--
-- TOC entry 5804 (class 0 OID 0)
-- Dependencies: 230
-- Name: organizations_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.organizations_id_seq', 1, true);


--
-- TOC entry 5805 (class 0 OID 0)
-- Dependencies: 315
-- Name: personal_access_tokens_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.personal_access_tokens_id_seq', 1, false);


--
-- TOC entry 5806 (class 0 OID 0)
-- Dependencies: 232
-- Name: persons_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.persons_id_seq', 1, false);


--
-- TOC entry 5807 (class 0 OID 0)
-- Dependencies: 279
-- Name: product_inventories_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.product_inventories_id_seq', 1, false);


--
-- TOC entry 5808 (class 0 OID 0)
-- Dependencies: 234
-- Name: products_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.products_id_seq', 2, true);


--
-- TOC entry 5809 (class 0 OID 0)
-- Dependencies: 261
-- Name: quote_items_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.quote_items_id_seq', 1, false);


--
-- TOC entry 5810 (class 0 OID 0)
-- Dependencies: 259
-- Name: quotes_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.quotes_id_seq', 1, false);


--
-- TOC entry 5811 (class 0 OID 0)
-- Dependencies: 218
-- Name: roles_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.roles_id_seq', 3, true);


--
-- TOC entry 5812 (class 0 OID 0)
-- Dependencies: 254
-- Name: tags_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.tags_id_seq', 1, false);


--
-- TOC entry 5813 (class 0 OID 0)
-- Dependencies: 220
-- Name: users_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.users_id_seq', 1, true);


--
-- TOC entry 5814 (class 0 OID 0)
-- Dependencies: 277
-- Name: warehouse_locations_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.warehouse_locations_id_seq', 1, false);


--
-- TOC entry 5815 (class 0 OID 0)
-- Dependencies: 275
-- Name: warehouses_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.warehouses_id_seq', 1, false);


--
-- TOC entry 5816 (class 0 OID 0)
-- Dependencies: 319
-- Name: web_form_attributes_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.web_form_attributes_id_seq', 1, false);


--
-- TOC entry 5817 (class 0 OID 0)
-- Dependencies: 317
-- Name: web_forms_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.web_forms_id_seq', 1, false);


--
-- TOC entry 5818 (class 0 OID 0)
-- Dependencies: 321
-- Name: webhooks_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.webhooks_id_seq', 1, false);


--
-- TOC entry 5819 (class 0 OID 0)
-- Dependencies: 323
-- Name: workflows_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.workflows_id_seq', 2, true);


--
-- TOC entry 5291 (class 2606 OID 37061)
-- Name: activities activities_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.activities
    ADD CONSTRAINT activities_pkey PRIMARY KEY (id);


--
-- TOC entry 5294 (class 2606 OID 37076)
-- Name: activity_files activity_files_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.activity_files
    ADD CONSTRAINT activity_files_pkey PRIMARY KEY (id);


--
-- TOC entry 5297 (class 2606 OID 37089)
-- Name: activity_participants activity_participants_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.activity_participants
    ADD CONSTRAINT activity_participants_pkey PRIMARY KEY (id);


--
-- TOC entry 5238 (class 2606 OID 36798)
-- Name: attribute_options attribute_options_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.attribute_options
    ADD CONSTRAINT attribute_options_pkey PRIMARY KEY (id);


--
-- TOC entry 5241 (class 2606 OID 36815)
-- Name: attribute_values attribute_values_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.attribute_values
    ADD CONSTRAINT attribute_values_pkey PRIMARY KEY (id);


--
-- TOC entry 5243 (class 2606 OID 36817)
-- Name: attribute_values attribute_values_unique_id_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.attribute_values
    ADD CONSTRAINT attribute_values_unique_id_key UNIQUE (unique_id);


--
-- TOC entry 5234 (class 2606 OID 36790)
-- Name: attributes attributes_code_entity_type_unique; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.attributes
    ADD CONSTRAINT attributes_code_entity_type_unique UNIQUE (code, entity_type);


--
-- TOC entry 5236 (class 2606 OID 36788)
-- Name: attributes attributes_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.attributes
    ADD CONSTRAINT attributes_pkey PRIMARY KEY (id);


--
-- TOC entry 5356 (class 2606 OID 37401)
-- Name: contact_export_batch_items contact_export_batch_items_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.contact_export_batch_items
    ADD CONSTRAINT contact_export_batch_items_pkey PRIMARY KEY (id);


--
-- TOC entry 5353 (class 2606 OID 37384)
-- Name: contact_export_batches contact_export_batches_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.contact_export_batches
    ADD CONSTRAINT contact_export_batches_pkey PRIMARY KEY (id);


--
-- TOC entry 5360 (class 2606 OID 37422)
-- Name: core_config core_config_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.core_config
    ADD CONSTRAINT core_config_pkey PRIMARY KEY (id);


--
-- TOC entry 5214 (class 2606 OID 36701)
-- Name: countries countries_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.countries
    ADD CONSTRAINT countries_pkey PRIMARY KEY (id);


--
-- TOC entry 5216 (class 2606 OID 36710)
-- Name: country_states country_states_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.country_states
    ADD CONSTRAINT country_states_pkey PRIMARY KEY (id);


--
-- TOC entry 5362 (class 2606 OID 37431)
-- Name: datagrid_saved_filters datagrid_saved_filters_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.datagrid_saved_filters
    ADD CONSTRAINT datagrid_saved_filters_pkey PRIMARY KEY (id);


--
-- TOC entry 5364 (class 2606 OID 37433)
-- Name: datagrid_saved_filters datagrid_saved_filters_user_id_name_src_unique; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.datagrid_saved_filters
    ADD CONSTRAINT datagrid_saved_filters_user_id_name_src_unique UNIQUE (user_id, name, src);


--
-- TOC entry 5340 (class 2606 OID 37320)
-- Name: email_attachments email_attachments_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.email_attachments
    ADD CONSTRAINT email_attachments_pkey PRIMARY KEY (id);


--
-- TOC entry 5327 (class 2606 OID 37273)
-- Name: email_templates email_templates_name_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.email_templates
    ADD CONSTRAINT email_templates_name_key UNIQUE (name);


--
-- TOC entry 5329 (class 2606 OID 37271)
-- Name: email_templates email_templates_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.email_templates
    ADD CONSTRAINT email_templates_pkey PRIMARY KEY (id);


--
-- TOC entry 5331 (class 2606 OID 37290)
-- Name: emails emails_message_id_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.emails
    ADD CONSTRAINT emails_message_id_key UNIQUE (message_id);


--
-- TOC entry 5333 (class 2606 OID 37286)
-- Name: emails emails_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.emails
    ADD CONSTRAINT emails_pkey PRIMARY KEY (id);


--
-- TOC entry 5335 (class 2606 OID 37288)
-- Name: emails emails_unique_id_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.emails
    ADD CONSTRAINT emails_unique_id_key UNIQUE (unique_id);


--
-- TOC entry 5245 (class 2606 OID 36819)
-- Name: attribute_values entity_type_attribute_value_index_unique; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.attribute_values
    ADD CONSTRAINT entity_type_attribute_value_index_unique UNIQUE (entity_type, entity_id, attribute_id);


--
-- TOC entry 5345 (class 2606 OID 37351)
-- Name: failed_jobs failed_jobs_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.failed_jobs
    ADD CONSTRAINT failed_jobs_pkey PRIMARY KEY (id);


--
-- TOC entry 5347 (class 2606 OID 37353)
-- Name: failed_jobs failed_jobs_uuid_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.failed_jobs
    ADD CONSTRAINT failed_jobs_uuid_key UNIQUE (uuid);


--
-- TOC entry 5349 (class 2606 OID 37362)
-- Name: google_contact_accounts google_contact_accounts_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.google_contact_accounts
    ADD CONSTRAINT google_contact_accounts_pkey PRIMARY KEY (id);


--
-- TOC entry 5351 (class 2606 OID 37364)
-- Name: google_contact_accounts google_contact_accounts_user_id_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.google_contact_accounts
    ADD CONSTRAINT google_contact_accounts_user_id_key UNIQUE (user_id);


--
-- TOC entry 5209 (class 2606 OID 36673)
-- Name: groups groups_name_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.groups
    ADD CONSTRAINT groups_name_key UNIQUE (name);


--
-- TOC entry 5211 (class 2606 OID 36671)
-- Name: groups groups_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.groups
    ADD CONSTRAINT groups_pkey PRIMARY KEY (id);


--
-- TOC entry 5369 (class 2606 OID 37459)
-- Name: import_batches import_batches_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.import_batches
    ADD CONSTRAINT import_batches_pkey PRIMARY KEY (id);


--
-- TOC entry 5366 (class 2606 OID 37449)
-- Name: imports imports_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.imports
    ADD CONSTRAINT imports_pkey PRIMARY KEY (id);


--
-- TOC entry 5371 (class 2606 OID 37472)
-- Name: job_batches job_batches_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.job_batches
    ADD CONSTRAINT job_batches_pkey PRIMARY KEY (id);


--
-- TOC entry 5374 (class 2606 OID 37481)
-- Name: jobs jobs_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.jobs
    ADD CONSTRAINT jobs_pkey PRIMARY KEY (id);


--
-- TOC entry 5257 (class 2606 OID 36865)
-- Name: lead_pipeline_stages lead_pipeline_stages_code_lead_pipeline_id_unique; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.lead_pipeline_stages
    ADD CONSTRAINT lead_pipeline_stages_code_lead_pipeline_id_unique UNIQUE (code, lead_pipeline_id);


--
-- TOC entry 5259 (class 2606 OID 36867)
-- Name: lead_pipeline_stages lead_pipeline_stages_name_lead_pipeline_id_unique; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.lead_pipeline_stages
    ADD CONSTRAINT lead_pipeline_stages_name_lead_pipeline_id_unique UNIQUE (name, lead_pipeline_id);


--
-- TOC entry 5261 (class 2606 OID 36863)
-- Name: lead_pipeline_stages lead_pipeline_stages_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.lead_pipeline_stages
    ADD CONSTRAINT lead_pipeline_stages_pkey PRIMARY KEY (id);


--
-- TOC entry 5252 (class 2606 OID 36850)
-- Name: lead_pipelines lead_pipelines_name_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.lead_pipelines
    ADD CONSTRAINT lead_pipelines_name_key UNIQUE (name);


--
-- TOC entry 5254 (class 2606 OID 36848)
-- Name: lead_pipelines lead_pipelines_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.lead_pipelines
    ADD CONSTRAINT lead_pipelines_pkey PRIMARY KEY (id);


--
-- TOC entry 5280 (class 2606 OID 36970)
-- Name: lead_products lead_products_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.lead_products
    ADD CONSTRAINT lead_products_pkey PRIMARY KEY (id);


--
-- TOC entry 5248 (class 2606 OID 36832)
-- Name: lead_sources lead_sources_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.lead_sources
    ADD CONSTRAINT lead_sources_pkey PRIMARY KEY (id);


--
-- TOC entry 5263 (class 2606 OID 36883)
-- Name: lead_stages lead_stages_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.lead_stages
    ADD CONSTRAINT lead_stages_pkey PRIMARY KEY (id);


--
-- TOC entry 5250 (class 2606 OID 36839)
-- Name: lead_types lead_types_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.lead_types
    ADD CONSTRAINT lead_types_pkey PRIMARY KEY (id);


--
-- TOC entry 5271 (class 2606 OID 36893)
-- Name: leads leads_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.leads
    ADD CONSTRAINT leads_pkey PRIMARY KEY (id);


--
-- TOC entry 5380 (class 2606 OID 37502)
-- Name: marketing_campaigns marketing_campaigns_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.marketing_campaigns
    ADD CONSTRAINT marketing_campaigns_pkey PRIMARY KEY (id);


--
-- TOC entry 5376 (class 2606 OID 37491)
-- Name: marketing_events marketing_events_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.marketing_events
    ADD CONSTRAINT marketing_events_pkey PRIMARY KEY (id);


--
-- TOC entry 5382 (class 2606 OID 37521)
-- Name: migrations migrations_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.migrations
    ADD CONSTRAINT migrations_pkey PRIMARY KEY (id);


--
-- TOC entry 5220 (class 2606 OID 36727)
-- Name: organizations organizations_name_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.organizations
    ADD CONSTRAINT organizations_name_key UNIQUE (name);


--
-- TOC entry 5222 (class 2606 OID 36725)
-- Name: organizations organizations_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.organizations
    ADD CONSTRAINT organizations_pkey PRIMARY KEY (id);


--
-- TOC entry 5385 (class 2606 OID 37530)
-- Name: personal_access_tokens personal_access_tokens_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.personal_access_tokens
    ADD CONSTRAINT personal_access_tokens_pkey PRIMARY KEY (id);


--
-- TOC entry 5387 (class 2606 OID 37532)
-- Name: personal_access_tokens personal_access_tokens_token_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.personal_access_tokens
    ADD CONSTRAINT personal_access_tokens_token_key UNIQUE (token);


--
-- TOC entry 5226 (class 2606 OID 36744)
-- Name: persons persons_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.persons
    ADD CONSTRAINT persons_pkey PRIMARY KEY (id);


--
-- TOC entry 5228 (class 2606 OID 36746)
-- Name: persons persons_unique_id_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.persons
    ADD CONSTRAINT persons_unique_id_key UNIQUE (unique_id);


--
-- TOC entry 5321 (class 2606 OID 37214)
-- Name: product_inventories product_inventories_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.product_inventories
    ADD CONSTRAINT product_inventories_pkey PRIMARY KEY (id);


--
-- TOC entry 5230 (class 2606 OID 36771)
-- Name: products products_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.products
    ADD CONSTRAINT products_pkey PRIMARY KEY (id);


--
-- TOC entry 5232 (class 2606 OID 36773)
-- Name: products products_sku_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.products
    ADD CONSTRAINT products_sku_key UNIQUE (sku);


--
-- TOC entry 5287 (class 2606 OID 37028)
-- Name: quote_items quote_items_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.quote_items
    ADD CONSTRAINT quote_items_pkey PRIMARY KEY (id);


--
-- TOC entry 5284 (class 2606 OID 36997)
-- Name: quotes quotes_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.quotes
    ADD CONSTRAINT quotes_pkey PRIMARY KEY (id);


--
-- TOC entry 5203 (class 2606 OID 36630)
-- Name: roles roles_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.roles
    ADD CONSTRAINT roles_pkey PRIMARY KEY (id);


--
-- TOC entry 5274 (class 2606 OID 36939)
-- Name: tags tags_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.tags
    ADD CONSTRAINT tags_pkey PRIMARY KEY (id);


--
-- TOC entry 5205 (class 2606 OID 36646)
-- Name: users users_email_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_email_key UNIQUE (email);


--
-- TOC entry 5207 (class 2606 OID 36644)
-- Name: users users_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_pkey PRIMARY KEY (id);


--
-- TOC entry 5314 (class 2606 OID 37198)
-- Name: warehouse_locations warehouse_locations_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.warehouse_locations
    ADD CONSTRAINT warehouse_locations_pkey PRIMARY KEY (id);


--
-- TOC entry 5316 (class 2606 OID 37200)
-- Name: warehouse_locations warehouse_locations_warehouse_id_name_unique; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.warehouse_locations
    ADD CONSTRAINT warehouse_locations_warehouse_id_name_unique UNIQUE (warehouse_id, name);


--
-- TOC entry 5312 (class 2606 OID 37191)
-- Name: warehouses warehouses_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.warehouses
    ADD CONSTRAINT warehouses_pkey PRIMARY KEY (id);


--
-- TOC entry 5396 (class 2606 OID 37569)
-- Name: web_form_attributes web_form_attributes_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.web_form_attributes
    ADD CONSTRAINT web_form_attributes_pkey PRIMARY KEY (id);


--
-- TOC entry 5390 (class 2606 OID 37550)
-- Name: web_forms web_forms_form_id_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.web_forms
    ADD CONSTRAINT web_forms_form_id_key UNIQUE (form_id);


--
-- TOC entry 5392 (class 2606 OID 37548)
-- Name: web_forms web_forms_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.web_forms
    ADD CONSTRAINT web_forms_pkey PRIMARY KEY (id);


--
-- TOC entry 5398 (class 2606 OID 37591)
-- Name: webhooks webhooks_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.webhooks
    ADD CONSTRAINT webhooks_pkey PRIMARY KEY (id);


--
-- TOC entry 5400 (class 2606 OID 37602)
-- Name: workflows workflows_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.workflows
    ADD CONSTRAINT workflows_pkey PRIMARY KEY (id);


--
-- TOC entry 5292 (class 1259 OID 37067)
-- Name: idx_activities_user_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_activities_user_id ON public.activities USING btree (user_id);


--
-- TOC entry 5295 (class 1259 OID 37082)
-- Name: idx_activity_files_activity_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_activity_files_activity_id ON public.activity_files USING btree (activity_id);


--
-- TOC entry 5298 (class 1259 OID 37105)
-- Name: idx_activity_participants_activity_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_activity_participants_activity_id ON public.activity_participants USING btree (activity_id);


--
-- TOC entry 5299 (class 1259 OID 37107)
-- Name: idx_activity_participants_person_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_activity_participants_person_id ON public.activity_participants USING btree (person_id);


--
-- TOC entry 5300 (class 1259 OID 37106)
-- Name: idx_activity_participants_user_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_activity_participants_user_id ON public.activity_participants USING btree (user_id);


--
-- TOC entry 5239 (class 1259 OID 36804)
-- Name: idx_attribute_options_attribute_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_attribute_options_attribute_id ON public.attribute_options USING btree (attribute_id);


--
-- TOC entry 5246 (class 1259 OID 36825)
-- Name: idx_attribute_values_attribute_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_attribute_values_attribute_id ON public.attribute_values USING btree (attribute_id);


--
-- TOC entry 5357 (class 1259 OID 37412)
-- Name: idx_contact_export_batch_items_batch_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_contact_export_batch_items_batch_id ON public.contact_export_batch_items USING btree (batch_id);


--
-- TOC entry 5358 (class 1259 OID 37413)
-- Name: idx_contact_export_batch_items_person_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_contact_export_batch_items_person_id ON public.contact_export_batch_items USING btree (person_id);


--
-- TOC entry 5354 (class 1259 OID 37390)
-- Name: idx_contact_export_batches_user_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_contact_export_batches_user_id ON public.contact_export_batches USING btree (user_id);


--
-- TOC entry 5217 (class 1259 OID 36716)
-- Name: idx_country_states_country_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_country_states_country_id ON public.country_states USING btree (country_id);


--
-- TOC entry 5341 (class 1259 OID 37326)
-- Name: idx_email_attachments_email_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_email_attachments_email_id ON public.email_attachments USING btree (email_id);


--
-- TOC entry 5342 (class 1259 OID 37341)
-- Name: idx_email_tags_email_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_email_tags_email_id ON public.email_tags USING btree (email_id);


--
-- TOC entry 5343 (class 1259 OID 37340)
-- Name: idx_email_tags_tag_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_email_tags_tag_id ON public.email_tags USING btree (tag_id);


--
-- TOC entry 5336 (class 1259 OID 37307)
-- Name: idx_emails_lead_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_emails_lead_id ON public.emails USING btree (lead_id);


--
-- TOC entry 5337 (class 1259 OID 37308)
-- Name: idx_emails_parent_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_emails_parent_id ON public.emails USING btree (parent_id);


--
-- TOC entry 5338 (class 1259 OID 37306)
-- Name: idx_emails_person_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_emails_person_id ON public.emails USING btree (person_id);


--
-- TOC entry 5367 (class 1259 OID 37465)
-- Name: idx_import_batches_import_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_import_batches_import_id ON public.import_batches USING btree (import_id);


--
-- TOC entry 5372 (class 1259 OID 37482)
-- Name: idx_jobs_queue; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_jobs_queue ON public.jobs USING btree (queue);


--
-- TOC entry 5301 (class 1259 OID 37121)
-- Name: idx_lead_activities_activity_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_lead_activities_activity_id ON public.lead_activities USING btree (activity_id);


--
-- TOC entry 5302 (class 1259 OID 37122)
-- Name: idx_lead_activities_lead_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_lead_activities_lead_id ON public.lead_activities USING btree (lead_id);


--
-- TOC entry 5255 (class 1259 OID 36873)
-- Name: idx_lead_pipeline_stages_pipeline_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_lead_pipeline_stages_pipeline_id ON public.lead_pipeline_stages USING btree (lead_pipeline_id);


--
-- TOC entry 5277 (class 1259 OID 36981)
-- Name: idx_lead_products_lead_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_lead_products_lead_id ON public.lead_products USING btree (lead_id);


--
-- TOC entry 5278 (class 1259 OID 36982)
-- Name: idx_lead_products_product_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_lead_products_product_id ON public.lead_products USING btree (product_id);


--
-- TOC entry 5288 (class 1259 OID 37049)
-- Name: idx_lead_quotes_lead_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_lead_quotes_lead_id ON public.lead_quotes USING btree (lead_id);


--
-- TOC entry 5289 (class 1259 OID 37048)
-- Name: idx_lead_quotes_quote_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_lead_quotes_quote_id ON public.lead_quotes USING btree (quote_id);


--
-- TOC entry 5275 (class 1259 OID 36960)
-- Name: idx_lead_tags_lead_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_lead_tags_lead_id ON public.lead_tags USING btree (lead_id);


--
-- TOC entry 5276 (class 1259 OID 36959)
-- Name: idx_lead_tags_tag_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_lead_tags_tag_id ON public.lead_tags USING btree (tag_id);


--
-- TOC entry 5264 (class 1259 OID 36928)
-- Name: idx_leads_lead_source_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_leads_lead_source_id ON public.leads USING btree (lead_source_id);


--
-- TOC entry 5265 (class 1259 OID 36929)
-- Name: idx_leads_lead_type_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_leads_lead_type_id ON public.leads USING btree (lead_type_id);


--
-- TOC entry 5266 (class 1259 OID 36927)
-- Name: idx_leads_person_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_leads_person_id ON public.leads USING btree (person_id);


--
-- TOC entry 5267 (class 1259 OID 36924)
-- Name: idx_leads_pipeline_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_leads_pipeline_id ON public.leads USING btree (lead_pipeline_id);


--
-- TOC entry 5268 (class 1259 OID 36925)
-- Name: idx_leads_pipeline_stage_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_leads_pipeline_stage_id ON public.leads USING btree (lead_pipeline_stage_id);


--
-- TOC entry 5269 (class 1259 OID 36926)
-- Name: idx_leads_user_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_leads_user_id ON public.leads USING btree (user_id);


--
-- TOC entry 5377 (class 1259 OID 37514)
-- Name: idx_marketing_campaigns_event_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_marketing_campaigns_event_id ON public.marketing_campaigns USING btree (marketing_event_id);


--
-- TOC entry 5378 (class 1259 OID 37513)
-- Name: idx_marketing_campaigns_template_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_marketing_campaigns_template_id ON public.marketing_campaigns USING btree (marketing_template_id);


--
-- TOC entry 5218 (class 1259 OID 36733)
-- Name: idx_organizations_user_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_organizations_user_id ON public.organizations USING btree (user_id);


--
-- TOC entry 5303 (class 1259 OID 37136)
-- Name: idx_person_activities_activity_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_person_activities_activity_id ON public.person_activities USING btree (activity_id);


--
-- TOC entry 5304 (class 1259 OID 37137)
-- Name: idx_person_activities_person_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_person_activities_person_id ON public.person_activities USING btree (person_id);


--
-- TOC entry 5305 (class 1259 OID 37152)
-- Name: idx_person_tags_person_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_person_tags_person_id ON public.person_tags USING btree (person_id);


--
-- TOC entry 5306 (class 1259 OID 37151)
-- Name: idx_person_tags_tag_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_person_tags_tag_id ON public.person_tags USING btree (tag_id);


--
-- TOC entry 5383 (class 1259 OID 37533)
-- Name: idx_personal_access_tokens_type_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_personal_access_tokens_type_id ON public.personal_access_tokens USING btree (tokenable_type, tokenable_id);


--
-- TOC entry 5223 (class 1259 OID 36758)
-- Name: idx_persons_organization_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_persons_organization_id ON public.persons USING btree (organization_id);


--
-- TOC entry 5224 (class 1259 OID 36757)
-- Name: idx_persons_user_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_persons_user_id ON public.persons USING btree (user_id);


--
-- TOC entry 5307 (class 1259 OID 37166)
-- Name: idx_product_activities_activity_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_product_activities_activity_id ON public.product_activities USING btree (activity_id);


--
-- TOC entry 5308 (class 1259 OID 37167)
-- Name: idx_product_activities_product_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_product_activities_product_id ON public.product_activities USING btree (product_id);


--
-- TOC entry 5317 (class 1259 OID 37232)
-- Name: idx_product_inventories_location_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_product_inventories_location_id ON public.product_inventories USING btree (warehouse_location_id);


--
-- TOC entry 5318 (class 1259 OID 37230)
-- Name: idx_product_inventories_product_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_product_inventories_product_id ON public.product_inventories USING btree (product_id);


--
-- TOC entry 5319 (class 1259 OID 37231)
-- Name: idx_product_inventories_warehouse_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_product_inventories_warehouse_id ON public.product_inventories USING btree (warehouse_id);


--
-- TOC entry 5309 (class 1259 OID 37182)
-- Name: idx_product_tags_product_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_product_tags_product_id ON public.product_tags USING btree (product_id);


--
-- TOC entry 5310 (class 1259 OID 37181)
-- Name: idx_product_tags_tag_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_product_tags_tag_id ON public.product_tags USING btree (tag_id);


--
-- TOC entry 5285 (class 1259 OID 37034)
-- Name: idx_quote_items_quote_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_quote_items_quote_id ON public.quote_items USING btree (quote_id);


--
-- TOC entry 5281 (class 1259 OID 37008)
-- Name: idx_quotes_person_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_quotes_person_id ON public.quotes USING btree (person_id);


--
-- TOC entry 5282 (class 1259 OID 37009)
-- Name: idx_quotes_user_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_quotes_user_id ON public.quotes USING btree (user_id);


--
-- TOC entry 5272 (class 1259 OID 36945)
-- Name: idx_tags_user_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_tags_user_id ON public.tags USING btree (user_id);


--
-- TOC entry 5212 (class 1259 OID 36692)
-- Name: idx_user_password_resets_email; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_user_password_resets_email ON public.user_password_resets USING btree (email);


--
-- TOC entry 5322 (class 1259 OID 37246)
-- Name: idx_warehouse_activities_activity_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_warehouse_activities_activity_id ON public.warehouse_activities USING btree (activity_id);


--
-- TOC entry 5323 (class 1259 OID 37247)
-- Name: idx_warehouse_activities_warehouse_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_warehouse_activities_warehouse_id ON public.warehouse_activities USING btree (warehouse_id);


--
-- TOC entry 5324 (class 1259 OID 37261)
-- Name: idx_warehouse_tags_tag_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_warehouse_tags_tag_id ON public.warehouse_tags USING btree (tag_id);


--
-- TOC entry 5325 (class 1259 OID 37262)
-- Name: idx_warehouse_tags_warehouse_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_warehouse_tags_warehouse_id ON public.warehouse_tags USING btree (warehouse_id);


--
-- TOC entry 5393 (class 1259 OID 37580)
-- Name: idx_web_form_attributes_attr_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_web_form_attributes_attr_id ON public.web_form_attributes USING btree (attribute_id);


--
-- TOC entry 5394 (class 1259 OID 37581)
-- Name: idx_web_form_attributes_form_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_web_form_attributes_form_id ON public.web_form_attributes USING btree (web_form_id);


--
-- TOC entry 5388 (class 1259 OID 37556)
-- Name: idx_web_forms_lead_pipeline_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_web_forms_lead_pipeline_id ON public.web_forms USING btree (lead_pipeline_id);


--
-- TOC entry 5429 (class 2606 OID 37062)
-- Name: activities activities_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.activities
    ADD CONSTRAINT activities_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- TOC entry 5430 (class 2606 OID 37077)
-- Name: activity_files activity_files_activity_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.activity_files
    ADD CONSTRAINT activity_files_activity_id_fkey FOREIGN KEY (activity_id) REFERENCES public.activities(id) ON DELETE CASCADE;


--
-- TOC entry 5431 (class 2606 OID 37090)
-- Name: activity_participants activity_participants_activity_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.activity_participants
    ADD CONSTRAINT activity_participants_activity_id_fkey FOREIGN KEY (activity_id) REFERENCES public.activities(id) ON DELETE CASCADE;


--
-- TOC entry 5432 (class 2606 OID 37100)
-- Name: activity_participants activity_participants_person_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.activity_participants
    ADD CONSTRAINT activity_participants_person_id_fkey FOREIGN KEY (person_id) REFERENCES public.persons(id) ON DELETE CASCADE;


--
-- TOC entry 5433 (class 2606 OID 37095)
-- Name: activity_participants activity_participants_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.activity_participants
    ADD CONSTRAINT activity_participants_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- TOC entry 5410 (class 2606 OID 36799)
-- Name: attribute_options attribute_options_attribute_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.attribute_options
    ADD CONSTRAINT attribute_options_attribute_id_fkey FOREIGN KEY (attribute_id) REFERENCES public.attributes(id) ON DELETE CASCADE;


--
-- TOC entry 5411 (class 2606 OID 36820)
-- Name: attribute_values attribute_values_attribute_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.attribute_values
    ADD CONSTRAINT attribute_values_attribute_id_fkey FOREIGN KEY (attribute_id) REFERENCES public.attributes(id) ON DELETE CASCADE;


--
-- TOC entry 5460 (class 2606 OID 37402)
-- Name: contact_export_batch_items contact_export_batch_items_batch_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.contact_export_batch_items
    ADD CONSTRAINT contact_export_batch_items_batch_id_fkey FOREIGN KEY (batch_id) REFERENCES public.contact_export_batches(id) ON DELETE CASCADE;


--
-- TOC entry 5461 (class 2606 OID 37407)
-- Name: contact_export_batch_items contact_export_batch_items_person_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.contact_export_batch_items
    ADD CONSTRAINT contact_export_batch_items_person_id_fkey FOREIGN KEY (person_id) REFERENCES public.persons(id) ON DELETE CASCADE;


--
-- TOC entry 5459 (class 2606 OID 37385)
-- Name: contact_export_batches contact_export_batches_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.contact_export_batches
    ADD CONSTRAINT contact_export_batches_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- TOC entry 5406 (class 2606 OID 36711)
-- Name: country_states country_states_country_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.country_states
    ADD CONSTRAINT country_states_country_id_fkey FOREIGN KEY (country_id) REFERENCES public.countries(id) ON DELETE CASCADE;


--
-- TOC entry 5455 (class 2606 OID 37321)
-- Name: email_attachments email_attachments_email_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.email_attachments
    ADD CONSTRAINT email_attachments_email_id_fkey FOREIGN KEY (email_id) REFERENCES public.emails(id) ON DELETE CASCADE;


--
-- TOC entry 5456 (class 2606 OID 37335)
-- Name: email_tags email_tags_email_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.email_tags
    ADD CONSTRAINT email_tags_email_id_fkey FOREIGN KEY (email_id) REFERENCES public.emails(id) ON DELETE CASCADE;


--
-- TOC entry 5457 (class 2606 OID 37330)
-- Name: email_tags email_tags_tag_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.email_tags
    ADD CONSTRAINT email_tags_tag_id_fkey FOREIGN KEY (tag_id) REFERENCES public.tags(id) ON DELETE CASCADE;


--
-- TOC entry 5452 (class 2606 OID 37296)
-- Name: emails emails_lead_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.emails
    ADD CONSTRAINT emails_lead_id_fkey FOREIGN KEY (lead_id) REFERENCES public.leads(id) ON DELETE SET NULL;


--
-- TOC entry 5453 (class 2606 OID 37301)
-- Name: emails emails_parent_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.emails
    ADD CONSTRAINT emails_parent_id_fkey FOREIGN KEY (parent_id) REFERENCES public.emails(id) ON DELETE CASCADE;


--
-- TOC entry 5454 (class 2606 OID 37291)
-- Name: emails emails_person_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.emails
    ADD CONSTRAINT emails_person_id_fkey FOREIGN KEY (person_id) REFERENCES public.persons(id) ON DELETE SET NULL;


--
-- TOC entry 5458 (class 2606 OID 37365)
-- Name: google_contact_accounts google_contact_accounts_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.google_contact_accounts
    ADD CONSTRAINT google_contact_accounts_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- TOC entry 5462 (class 2606 OID 37460)
-- Name: import_batches import_batches_import_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.import_batches
    ADD CONSTRAINT import_batches_import_id_fkey FOREIGN KEY (import_id) REFERENCES public.imports(id) ON DELETE CASCADE;


--
-- TOC entry 5434 (class 2606 OID 37111)
-- Name: lead_activities lead_activities_activity_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.lead_activities
    ADD CONSTRAINT lead_activities_activity_id_fkey FOREIGN KEY (activity_id) REFERENCES public.activities(id) ON DELETE CASCADE;


--
-- TOC entry 5435 (class 2606 OID 37116)
-- Name: lead_activities lead_activities_lead_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.lead_activities
    ADD CONSTRAINT lead_activities_lead_id_fkey FOREIGN KEY (lead_id) REFERENCES public.leads(id) ON DELETE CASCADE;


--
-- TOC entry 5412 (class 2606 OID 36868)
-- Name: lead_pipeline_stages lead_pipeline_stages_lead_pipeline_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.lead_pipeline_stages
    ADD CONSTRAINT lead_pipeline_stages_lead_pipeline_id_fkey FOREIGN KEY (lead_pipeline_id) REFERENCES public.lead_pipelines(id) ON DELETE CASCADE;


--
-- TOC entry 5422 (class 2606 OID 36971)
-- Name: lead_products lead_products_lead_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.lead_products
    ADD CONSTRAINT lead_products_lead_id_fkey FOREIGN KEY (lead_id) REFERENCES public.leads(id) ON DELETE CASCADE;


--
-- TOC entry 5423 (class 2606 OID 36976)
-- Name: lead_products lead_products_product_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.lead_products
    ADD CONSTRAINT lead_products_product_id_fkey FOREIGN KEY (product_id) REFERENCES public.products(id) ON DELETE CASCADE;


--
-- TOC entry 5427 (class 2606 OID 37043)
-- Name: lead_quotes lead_quotes_lead_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.lead_quotes
    ADD CONSTRAINT lead_quotes_lead_id_fkey FOREIGN KEY (lead_id) REFERENCES public.leads(id) ON DELETE CASCADE;


--
-- TOC entry 5428 (class 2606 OID 37038)
-- Name: lead_quotes lead_quotes_quote_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.lead_quotes
    ADD CONSTRAINT lead_quotes_quote_id_fkey FOREIGN KEY (quote_id) REFERENCES public.quotes(id) ON DELETE CASCADE;


--
-- TOC entry 5420 (class 2606 OID 36954)
-- Name: lead_tags lead_tags_lead_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.lead_tags
    ADD CONSTRAINT lead_tags_lead_id_fkey FOREIGN KEY (lead_id) REFERENCES public.leads(id) ON DELETE CASCADE;


--
-- TOC entry 5421 (class 2606 OID 36949)
-- Name: lead_tags lead_tags_tag_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.lead_tags
    ADD CONSTRAINT lead_tags_tag_id_fkey FOREIGN KEY (tag_id) REFERENCES public.tags(id) ON DELETE CASCADE;


--
-- TOC entry 5413 (class 2606 OID 36914)
-- Name: leads leads_lead_pipeline_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.leads
    ADD CONSTRAINT leads_lead_pipeline_id_fkey FOREIGN KEY (lead_pipeline_id) REFERENCES public.lead_pipelines(id) ON DELETE CASCADE;


--
-- TOC entry 5414 (class 2606 OID 36919)
-- Name: leads leads_lead_pipeline_stage_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.leads
    ADD CONSTRAINT leads_lead_pipeline_stage_id_fkey FOREIGN KEY (lead_pipeline_stage_id) REFERENCES public.lead_pipeline_stages(id) ON DELETE SET NULL;


--
-- TOC entry 5415 (class 2606 OID 36904)
-- Name: leads leads_lead_source_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.leads
    ADD CONSTRAINT leads_lead_source_id_fkey FOREIGN KEY (lead_source_id) REFERENCES public.lead_sources(id);


--
-- TOC entry 5416 (class 2606 OID 36909)
-- Name: leads leads_lead_type_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.leads
    ADD CONSTRAINT leads_lead_type_id_fkey FOREIGN KEY (lead_type_id) REFERENCES public.lead_types(id);


--
-- TOC entry 5417 (class 2606 OID 36899)
-- Name: leads leads_person_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.leads
    ADD CONSTRAINT leads_person_id_fkey FOREIGN KEY (person_id) REFERENCES public.persons(id);


--
-- TOC entry 5418 (class 2606 OID 36894)
-- Name: leads leads_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.leads
    ADD CONSTRAINT leads_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE SET NULL;


--
-- TOC entry 5463 (class 2606 OID 37508)
-- Name: marketing_campaigns marketing_campaigns_marketing_event_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.marketing_campaigns
    ADD CONSTRAINT marketing_campaigns_marketing_event_id_fkey FOREIGN KEY (marketing_event_id) REFERENCES public.marketing_events(id) ON DELETE SET NULL;


--
-- TOC entry 5464 (class 2606 OID 37503)
-- Name: marketing_campaigns marketing_campaigns_marketing_template_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.marketing_campaigns
    ADD CONSTRAINT marketing_campaigns_marketing_template_id_fkey FOREIGN KEY (marketing_template_id) REFERENCES public.email_templates(id) ON DELETE SET NULL;


--
-- TOC entry 5407 (class 2606 OID 36728)
-- Name: organizations organizations_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.organizations
    ADD CONSTRAINT organizations_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE SET NULL;


--
-- TOC entry 5436 (class 2606 OID 37126)
-- Name: person_activities person_activities_activity_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.person_activities
    ADD CONSTRAINT person_activities_activity_id_fkey FOREIGN KEY (activity_id) REFERENCES public.activities(id) ON DELETE CASCADE;


--
-- TOC entry 5437 (class 2606 OID 37131)
-- Name: person_activities person_activities_person_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.person_activities
    ADD CONSTRAINT person_activities_person_id_fkey FOREIGN KEY (person_id) REFERENCES public.persons(id) ON DELETE CASCADE;


--
-- TOC entry 5438 (class 2606 OID 37146)
-- Name: person_tags person_tags_person_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.person_tags
    ADD CONSTRAINT person_tags_person_id_fkey FOREIGN KEY (person_id) REFERENCES public.persons(id) ON DELETE CASCADE;


--
-- TOC entry 5439 (class 2606 OID 37141)
-- Name: person_tags person_tags_tag_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.person_tags
    ADD CONSTRAINT person_tags_tag_id_fkey FOREIGN KEY (tag_id) REFERENCES public.tags(id) ON DELETE CASCADE;


--
-- TOC entry 5408 (class 2606 OID 36747)
-- Name: persons persons_organization_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.persons
    ADD CONSTRAINT persons_organization_id_fkey FOREIGN KEY (organization_id) REFERENCES public.organizations(id) ON DELETE SET NULL;


--
-- TOC entry 5409 (class 2606 OID 36752)
-- Name: persons persons_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.persons
    ADD CONSTRAINT persons_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE SET NULL;


--
-- TOC entry 5440 (class 2606 OID 37156)
-- Name: product_activities product_activities_activity_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.product_activities
    ADD CONSTRAINT product_activities_activity_id_fkey FOREIGN KEY (activity_id) REFERENCES public.activities(id) ON DELETE CASCADE;


--
-- TOC entry 5441 (class 2606 OID 37161)
-- Name: product_activities product_activities_product_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.product_activities
    ADD CONSTRAINT product_activities_product_id_fkey FOREIGN KEY (product_id) REFERENCES public.products(id) ON DELETE CASCADE;


--
-- TOC entry 5445 (class 2606 OID 37215)
-- Name: product_inventories product_inventories_product_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.product_inventories
    ADD CONSTRAINT product_inventories_product_id_fkey FOREIGN KEY (product_id) REFERENCES public.products(id) ON DELETE CASCADE;


--
-- TOC entry 5446 (class 2606 OID 37220)
-- Name: product_inventories product_inventories_warehouse_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.product_inventories
    ADD CONSTRAINT product_inventories_warehouse_id_fkey FOREIGN KEY (warehouse_id) REFERENCES public.warehouses(id) ON DELETE CASCADE;


--
-- TOC entry 5447 (class 2606 OID 37225)
-- Name: product_inventories product_inventories_warehouse_location_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.product_inventories
    ADD CONSTRAINT product_inventories_warehouse_location_id_fkey FOREIGN KEY (warehouse_location_id) REFERENCES public.warehouse_locations(id) ON DELETE CASCADE;


--
-- TOC entry 5442 (class 2606 OID 37176)
-- Name: product_tags product_tags_product_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.product_tags
    ADD CONSTRAINT product_tags_product_id_fkey FOREIGN KEY (product_id) REFERENCES public.products(id) ON DELETE CASCADE;


--
-- TOC entry 5443 (class 2606 OID 37171)
-- Name: product_tags product_tags_tag_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.product_tags
    ADD CONSTRAINT product_tags_tag_id_fkey FOREIGN KEY (tag_id) REFERENCES public.tags(id) ON DELETE CASCADE;


--
-- TOC entry 5426 (class 2606 OID 37029)
-- Name: quote_items quote_items_quote_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.quote_items
    ADD CONSTRAINT quote_items_quote_id_fkey FOREIGN KEY (quote_id) REFERENCES public.quotes(id) ON DELETE CASCADE;


--
-- TOC entry 5424 (class 2606 OID 36998)
-- Name: quotes quotes_person_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.quotes
    ADD CONSTRAINT quotes_person_id_fkey FOREIGN KEY (person_id) REFERENCES public.persons(id) ON DELETE CASCADE;


--
-- TOC entry 5425 (class 2606 OID 37003)
-- Name: quotes quotes_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.quotes
    ADD CONSTRAINT quotes_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- TOC entry 5401 (class 2606 OID 36657)
-- Name: roles roles_created_by_foreign; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.roles
    ADD CONSTRAINT roles_created_by_foreign FOREIGN KEY (created_by) REFERENCES public.users(id) ON DELETE SET NULL;


--
-- TOC entry 5419 (class 2606 OID 36940)
-- Name: tags tags_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.tags
    ADD CONSTRAINT tags_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- TOC entry 5404 (class 2606 OID 36677)
-- Name: user_groups user_groups_group_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.user_groups
    ADD CONSTRAINT user_groups_group_id_fkey FOREIGN KEY (group_id) REFERENCES public.groups(id) ON DELETE CASCADE;


--
-- TOC entry 5405 (class 2606 OID 36682)
-- Name: user_groups user_groups_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.user_groups
    ADD CONSTRAINT user_groups_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- TOC entry 5402 (class 2606 OID 36652)
-- Name: users users_created_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.users(id) ON DELETE SET NULL;


--
-- TOC entry 5403 (class 2606 OID 36647)
-- Name: users users_role_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_role_id_fkey FOREIGN KEY (role_id) REFERENCES public.roles(id) ON DELETE CASCADE;


--
-- TOC entry 5448 (class 2606 OID 37236)
-- Name: warehouse_activities warehouse_activities_activity_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.warehouse_activities
    ADD CONSTRAINT warehouse_activities_activity_id_fkey FOREIGN KEY (activity_id) REFERENCES public.activities(id) ON DELETE CASCADE;


--
-- TOC entry 5449 (class 2606 OID 37241)
-- Name: warehouse_activities warehouse_activities_warehouse_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.warehouse_activities
    ADD CONSTRAINT warehouse_activities_warehouse_id_fkey FOREIGN KEY (warehouse_id) REFERENCES public.warehouses(id) ON DELETE CASCADE;


--
-- TOC entry 5444 (class 2606 OID 37201)
-- Name: warehouse_locations warehouse_locations_warehouse_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.warehouse_locations
    ADD CONSTRAINT warehouse_locations_warehouse_id_fkey FOREIGN KEY (warehouse_id) REFERENCES public.warehouses(id) ON DELETE CASCADE;


--
-- TOC entry 5450 (class 2606 OID 37251)
-- Name: warehouse_tags warehouse_tags_tag_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.warehouse_tags
    ADD CONSTRAINT warehouse_tags_tag_id_fkey FOREIGN KEY (tag_id) REFERENCES public.tags(id) ON DELETE CASCADE;


--
-- TOC entry 5451 (class 2606 OID 37256)
-- Name: warehouse_tags warehouse_tags_warehouse_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.warehouse_tags
    ADD CONSTRAINT warehouse_tags_warehouse_id_fkey FOREIGN KEY (warehouse_id) REFERENCES public.warehouses(id) ON DELETE CASCADE;


--
-- TOC entry 5466 (class 2606 OID 37570)
-- Name: web_form_attributes web_form_attributes_attribute_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.web_form_attributes
    ADD CONSTRAINT web_form_attributes_attribute_id_fkey FOREIGN KEY (attribute_id) REFERENCES public.attributes(id) ON DELETE CASCADE;


--
-- TOC entry 5467 (class 2606 OID 37575)
-- Name: web_form_attributes web_form_attributes_web_form_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.web_form_attributes
    ADD CONSTRAINT web_form_attributes_web_form_id_fkey FOREIGN KEY (web_form_id) REFERENCES public.web_forms(id) ON DELETE CASCADE;


--
-- TOC entry 5465 (class 2606 OID 37551)
-- Name: web_forms web_forms_lead_pipeline_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.web_forms
    ADD CONSTRAINT web_forms_lead_pipeline_id_fkey FOREIGN KEY (lead_pipeline_id) REFERENCES public.lead_pipelines(id) ON DELETE SET NULL;


-- Completed on 2026-09-18 10:17:23

--
-- PostgreSQL database dump complete
--

\unrestrict qOvbgc9GfSr2ZJIypeEfDQ75wYUH7jfJ9KBJER8Eb6nlnZIrMMMKh4VgVdHbm4T

