-- Phase 1 seed: RURA authority + 5 platforms (ISP/telecom cluster).
-- Run after 001_init.sql.

INSERT INTO authorities (id, name, remit_description) VALUES
  ('a1000000-0000-0000-0000-000000000001',
   'RURA',
   'Rwanda Utilities Regulatory Authority — regulates telecoms, internet, electricity, water, and transport.');

INSERT INTO platforms (authority_id, name, base_url, category, public_support_channel) VALUES
  ('a1000000-0000-0000-0000-000000000001', 'MTN Rwanda',        'https://www.mtn.co.rw',       'telecom',  '@MTNRwanda'),
  ('a1000000-0000-0000-0000-000000000001', 'Airtel Rwanda',     'https://www.airtelrwanda.com', 'telecom',  '@AirtelRwanda'),
  ('a1000000-0000-0000-0000-000000000001', 'Canalbox',          'https://www.canalbox.rw',      'internet', NULL),
  ('a1000000-0000-0000-0000-000000000001', 'REG (Electricity)', 'https://www.reg.rw',           'energy',   NULL),
  ('a1000000-0000-0000-0000-000000000001', 'WASAC (Water)',     'https://www.wasac.rw',         'water',    NULL);
