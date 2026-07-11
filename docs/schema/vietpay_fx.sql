--
-- PostgreSQL database dump
--

\restrict pEbYmAcROzR6CyaM8ReAs5dYKYgdovcdUBChnDucnNAoZA0YJW6lzId2SdTExnO

-- Dumped from database version 16.14
-- Dumped by pg_dump version 16.14

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;

--
-- Name: uuid-ossp; Type: EXTENSION; Schema: -; Owner: -
--

CREATE EXTENSION IF NOT EXISTS "uuid-ossp" WITH SCHEMA public;


--
-- Name: EXTENSION "uuid-ossp"; Type: COMMENT; Schema: -; Owner: -
--

COMMENT ON EXTENSION "uuid-ossp" IS 'generate universally unique identifiers (UUIDs)';


SET default_tablespace = '';

SET default_table_access_method = heap;

--
-- Name: fx_rate_snapshots; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.fx_rate_snapshots (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    currency_code character varying(3) NOT NULL,
    currency_name character varying,
    buy numeric(19,4),
    transfer numeric(19,4),
    sell numeric(19,4),
    quote character varying(3) DEFAULT 'VND'::character varying NOT NULL,
    as_of timestamp with time zone,
    fetched_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: fx_rates; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.fx_rates (
    currency_code character varying(3) NOT NULL,
    currency_name character varying,
    buy numeric(19,4),
    transfer numeric(19,4),
    sell numeric(19,4),
    quote character varying(3) DEFAULT 'VND'::character varying NOT NULL,
    as_of timestamp with time zone,
    fetched_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: migrations_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.migrations_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Data for Name: fx_rate_snapshots; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.fx_rate_snapshots (id, currency_code, currency_name, buy, transfer, sell, quote, as_of, fetched_at) FROM stdin;
\.


--
-- Data for Name: fx_rates; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.fx_rates (currency_code, currency_name, buy, transfer, sell, quote, as_of, fetched_at) FROM stdin;
\.


--
-- Name: migrations_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.migrations_id_seq', 2, true);


--
-- Name: fx_rates PK_b30e81d03f7e1c3e94b8f5d6f2c; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.fx_rates
    ADD CONSTRAINT "PK_b30e81d03f7e1c3e94b8f5d6f2c" PRIMARY KEY (currency_code);


--
-- Name: fx_rate_snapshots PK_dbeb9b5262e07e1cac7aabd408a; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.fx_rate_snapshots
    ADD CONSTRAINT "PK_dbeb9b5262e07e1cac7aabd408a" PRIMARY KEY (id);


--
-- Name: IDX_fx_rate_snapshots_currency_fetched; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "IDX_fx_rate_snapshots_currency_fetched" ON public.fx_rate_snapshots USING btree (currency_code, fetched_at);


--
-- PostgreSQL database dump complete
--

\unrestrict pEbYmAcROzR6CyaM8ReAs5dYKYgdovcdUBChnDucnNAoZA0YJW6lzId2SdTExnO

