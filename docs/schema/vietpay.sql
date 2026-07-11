--
-- PostgreSQL database dump
--

\restrict EGFHgCllPvfkYLaQZIn6Ejk1wsifo9cU8l0Dw8Tvx7bFFK26O72jKQ1ohTvRUxZ

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
-- Name: pgcrypto; Type: EXTENSION; Schema: -; Owner: -
--

CREATE EXTENSION IF NOT EXISTS pgcrypto WITH SCHEMA public;


--
-- Name: EXTENSION pgcrypto; Type: COMMENT; Schema: -; Owner: -
--

COMMENT ON EXTENSION pgcrypto IS 'cryptographic functions';


SET default_tablespace = '';

SET default_table_access_method = heap;

--
-- Name: applied_payments; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.applied_payments (
    payment_id uuid NOT NULL,
    applied_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: ledger_entries; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.ledger_entries (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    transfer_id uuid,
    payment_id uuid,
    wallet_id uuid NOT NULL,
    direction character varying(6) NOT NULL,
    amount numeric(19,4) NOT NULL,
    currency character varying(3) NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT ledger_entries_amount_check CHECK ((amount > (0)::numeric)),
    CONSTRAINT ledger_entries_direction_check CHECK (((direction)::text = ANY ((ARRAY['DEBIT'::character varying, 'CREDIT'::character varying])::text[]))),
    CONSTRAINT ledger_entries_one_source CHECK (((transfer_id IS NOT NULL) <> (payment_id IS NOT NULL)))
);


--
-- Name: outbox_events; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.outbox_events (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    aggregate_type character varying(50) NOT NULL,
    aggregate_id uuid NOT NULL,
    event_type character varying(80) NOT NULL,
    payload jsonb NOT NULL,
    status character varying(16) DEFAULT 'PENDING'::character varying NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    published_at timestamp with time zone
);


--
-- Name: shedlock; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.shedlock (
    name character varying(64) NOT NULL,
    lock_until timestamp with time zone NOT NULL,
    locked_at timestamp with time zone NOT NULL,
    locked_by character varying(255) NOT NULL
);


--
-- Name: transfers; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.transfers (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    idempotency_key character varying(200) NOT NULL,
    source_wallet_id uuid NOT NULL,
    dest_wallet_id uuid NOT NULL,
    amount numeric(19,4) NOT NULL,
    currency character varying(3) NOT NULL,
    dest_amount numeric(19,4) NOT NULL,
    dest_currency character varying(3) NOT NULL,
    fx_rate numeric(19,8) DEFAULT 1 NOT NULL,
    status character varying(20) NOT NULL,
    response_snapshot jsonb,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    remark character varying(500),
    CONSTRAINT transfers_amount_check CHECK ((amount > (0)::numeric)),
    CONSTRAINT transfers_distinct_wallets CHECK ((source_wallet_id <> dest_wallet_id))
);


--
-- Name: wallets; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.wallets (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    currency character varying(3) NOT NULL,
    balance numeric(19,4) DEFAULT 0 NOT NULL,
    kind character varying(16) DEFAULT 'USER'::character varying NOT NULL,
    version bigint DEFAULT 0 NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    owner_user_id uuid,
    CONSTRAINT wallets_balance_nonneg_for_user CHECK ((((kind)::text = 'SYSTEM'::text) OR (balance >= (0)::numeric)))
);


--
-- Data for Name: applied_payments; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.applied_payments (payment_id, applied_at) FROM stdin;
\.


--
-- Data for Name: ledger_entries; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.ledger_entries (id, transfer_id, payment_id, wallet_id, direction, amount, currency, created_at) FROM stdin;
\.


--
-- Data for Name: outbox_events; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.outbox_events (id, aggregate_type, aggregate_id, event_type, payload, status, created_at, published_at) FROM stdin;
\.


--
-- Data for Name: shedlock; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.shedlock (name, lock_until, locked_at, locked_by) FROM stdin;
\.


--
-- Data for Name: transfers; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.transfers (id, idempotency_key, source_wallet_id, dest_wallet_id, amount, currency, dest_amount, dest_currency, fx_rate, status, response_snapshot, created_at, remark) FROM stdin;
\.


--
-- Data for Name: wallets; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.wallets (id, currency, balance, kind, version, created_at, updated_at, owner_user_id) FROM stdin;
00000000-0000-0000-0000-000000000001	USD	0.0000	SYSTEM	0	2026-07-11 17:33:17.212363+00	2026-07-11 17:33:17.212363+00	\N
00000000-0000-0000-0000-000000000010	USD	0.0000	SYSTEM	0	2026-07-11 17:33:17.524131+00	2026-07-11 17:33:17.524131+00	\N
00000000-0000-0000-0000-000000000011	EUR	0.0000	SYSTEM	0	2026-07-11 17:33:17.524131+00	2026-07-11 17:33:17.524131+00	\N
00000000-0000-0000-0000-000000000012	VND	0.0000	SYSTEM	0	2026-07-11 17:33:17.524131+00	2026-07-11 17:33:17.524131+00	\N
00000000-0000-0000-0000-000000000013	GBP	0.0000	SYSTEM	0	2026-07-11 17:33:17.524131+00	2026-07-11 17:33:17.524131+00	\N
\.


--
-- Name: applied_payments applied_payments_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.applied_payments
    ADD CONSTRAINT applied_payments_pkey PRIMARY KEY (payment_id);


--
-- Name: ledger_entries ledger_entries_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.ledger_entries
    ADD CONSTRAINT ledger_entries_pkey PRIMARY KEY (id);


--
-- Name: outbox_events outbox_events_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.outbox_events
    ADD CONSTRAINT outbox_events_pkey PRIMARY KEY (id);


--
-- Name: shedlock shedlock_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.shedlock
    ADD CONSTRAINT shedlock_pkey PRIMARY KEY (name);


--
-- Name: transfers transfers_idempotency_key_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.transfers
    ADD CONSTRAINT transfers_idempotency_key_key UNIQUE (idempotency_key);


--
-- Name: transfers transfers_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.transfers
    ADD CONSTRAINT transfers_pkey PRIMARY KEY (id);


--
-- Name: wallets wallets_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.wallets
    ADD CONSTRAINT wallets_pkey PRIMARY KEY (id);


--
-- Name: idx_ledger_transfer; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_ledger_transfer ON public.ledger_entries USING btree (transfer_id);


--
-- Name: idx_ledger_wallet; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_ledger_wallet ON public.ledger_entries USING btree (wallet_id, created_at);


--
-- Name: idx_outbox_pending; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_outbox_pending ON public.outbox_events USING btree (created_at) WHERE ((status)::text = 'PENDING'::text);


--
-- Name: idx_transfers_dest; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_transfers_dest ON public.transfers USING btree (dest_wallet_id);


--
-- Name: idx_transfers_source; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_transfers_source ON public.transfers USING btree (source_wallet_id);


--
-- Name: ledger_entries ledger_entries_transfer_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.ledger_entries
    ADD CONSTRAINT ledger_entries_transfer_id_fkey FOREIGN KEY (transfer_id) REFERENCES public.transfers(id);


--
-- Name: ledger_entries ledger_entries_wallet_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.ledger_entries
    ADD CONSTRAINT ledger_entries_wallet_id_fkey FOREIGN KEY (wallet_id) REFERENCES public.wallets(id);


--
-- Name: transfers transfers_dest_wallet_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.transfers
    ADD CONSTRAINT transfers_dest_wallet_id_fkey FOREIGN KEY (dest_wallet_id) REFERENCES public.wallets(id);


--
-- Name: transfers transfers_source_wallet_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.transfers
    ADD CONSTRAINT transfers_source_wallet_id_fkey FOREIGN KEY (source_wallet_id) REFERENCES public.wallets(id);


--
-- PostgreSQL database dump complete
--

\unrestrict EGFHgCllPvfkYLaQZIn6Ejk1wsifo9cU8l0Dw8Tvx7bFFK26O72jKQ1ohTvRUxZ

