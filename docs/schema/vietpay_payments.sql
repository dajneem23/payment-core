--
-- PostgreSQL database dump
--

\restrict vrGZuHPMUWaQpYsiAQSrWgt7qeVR0bLZYbm9vf15ITtCmLXMuCWSe8zsHJGUY80

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


SET default_tablespace = '';

SET default_table_access_method = heap;

--
-- Name: outbox_events; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.outbox_events (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    aggregate_type character varying NOT NULL,
    aggregate_id uuid NOT NULL,
    event_type character varying NOT NULL,
    payload jsonb NOT NULL,
    status character varying(20) DEFAULT 'PENDING'::character varying NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    published_at timestamp with time zone
);


--
-- Name: payments; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.payments (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    type character varying(20) DEFAULT 'TOPUP'::character varying NOT NULL,
    wallet_id uuid NOT NULL,
    scheme character varying(20) NOT NULL,
    card_token character varying NOT NULL,
    bin character varying(20) NOT NULL,
    amount numeric(19,4) NOT NULL,
    currency character(3) NOT NULL,
    status character varying(20) DEFAULT 'PENDING'::character varying NOT NULL,
    provider_ref character varying,
    owner_user_id uuid NOT NULL,
    idempotency_key character varying NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: processed_webhooks; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.processed_webhooks (
    provider_event_id character varying NOT NULL,
    payment_id uuid NOT NULL,
    received_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Data for Name: outbox_events; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.outbox_events (id, aggregate_type, aggregate_id, event_type, payload, status, created_at, published_at) FROM stdin;
\.


--
-- Data for Name: payments; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.payments (id, type, wallet_id, scheme, card_token, bin, amount, currency, status, provider_ref, owner_user_id, idempotency_key, created_at, updated_at) FROM stdin;
\.


--
-- Data for Name: processed_webhooks; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.processed_webhooks (provider_event_id, payment_id, received_at) FROM stdin;
\.


--
-- Name: migrations_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.migrations_id_seq', 1, true);


--
-- Name: payments PK_197ab7af18c93fbb0c9b28b4a59; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.payments
    ADD CONSTRAINT "PK_197ab7af18c93fbb0c9b28b4a59" PRIMARY KEY (id);


--
-- Name: outbox_events PK_6689a16c00d09b8089f6237f1d2; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.outbox_events
    ADD CONSTRAINT "PK_6689a16c00d09b8089f6237f1d2" PRIMARY KEY (id);


--
-- Name: processed_webhooks PK_a6f0fecbb6e0c151c973a2ae72b; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.processed_webhooks
    ADD CONSTRAINT "PK_a6f0fecbb6e0c151c973a2ae72b" PRIMARY KEY (provider_event_id);


--
-- Name: payments UQ_59dcef70bd19850783c84f840e5; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.payments
    ADD CONSTRAINT "UQ_59dcef70bd19850783c84f840e5" UNIQUE (idempotency_key);


--
-- Name: idx_outbox_events_status; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_outbox_events_status ON public.outbox_events USING btree (status);


--
-- Name: idx_payments_idempotency_key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX idx_payments_idempotency_key ON public.payments USING btree (idempotency_key);


--
-- PostgreSQL database dump complete
--

\unrestrict vrGZuHPMUWaQpYsiAQSrWgt7qeVR0bLZYbm9vf15ITtCmLXMuCWSe8zsHJGUY80

