# -*- coding: utf-8 -*-
"""v9.35 sorveglianza dell'accesso con Google: mai piu' ore di accesso bloccato senza saperlo."""
import unittest

from cot_radar import sorveglianza as S


def finto(prima, seconda):
    """prova(url) finta: prima risposta per Supabase, seconda per Google."""
    def prova(url):
        return prima if url == S.ACCEDI_GOOGLE else seconda
    return prova


SU = (302, "https://accounts.google.com/o/oauth2/v2/auth?client_id=x&redirect_uri=" + S.CALLBACK_GOOGLE, "")


class AccessoGoogle(unittest.TestCase):
    def test_funziona(self):
        self.assertIsNone(S.accesso_google(finto(SU, (302, "https://accounts.google.com/v3/signin/identifier?x=1", ""))))

    def test_redirect_uri_mismatch(self):
        p = S.accesso_google(finto(SU, (400, "", "<p>Errore 400: redirect_uri_mismatch</p>")))
        self.assertIn("redirect_uri_mismatch", p)
        self.assertIn(S.CALLBACK_GOOGLE, p)
        self.assertEqual(S.area(p), "Accesso")

    def test_pagina_errore(self):
        p = S.accesso_google(finto(SU, (302, "https://accounts.google.com/signin/oauth/error?authError=abc", "")))
        self.assertTrue(p and p.startswith("Accesso con Google bloccato"))

    def test_supabase_non_manda_a_google(self):
        self.assertIn("non parte", S.accesso_google(finto((500, "", ""), None)))

    def test_rete_giu_non_e_anomalia(self):
        def rotto(url):
            raise OSError("rete")
        self.assertIsNone(S.accesso_google(rotto))

    def test_entra_nei_problemi(self):
        p = S.problemi(S.datetime.now(S.timezone.utc), accesso="Accesso con Google bloccato (Google: x)")
        self.assertEqual(p[0], "Accesso con Google bloccato (Google: x)")


class EmailSenzaSmtp(unittest.TestCase):
    def test_fuori_da_github_nessuna_email(self):
        self.assertIsNone(S.email_admin("x", "y", {}))


if __name__ == "__main__":
    unittest.main()
