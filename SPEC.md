# Reservation Engine v2

**Strong consistency booking engine for small B2C & SMB events**

---

## 0. Positionnement explicite

Ce produit est un **moteur de réservation indépendant**, temps réel côté écriture, avec arbitrage strict et cohérence forte au moment de la réservation.

Il ne cherche pas à :

- battre Ticketmaster
- gérer des millions de requêtes simultanées
- devenir une marketplace

Il cherche à :

- offrir un moteur fiable, simple, prévisible
- gérer correctement la concurrence réelle
- servir des événements classiques, B2C ou small B2B
  (meetups, formations, restaurants, transports locaux, clubs, salles moyennes)

---

## 1. Principes non négociables

1. **Un gagnant unique**
   Premier arrivé, premier servi. Toujours.

2. **Cohérence forte à l'écriture**
   La vérité se décide au moment du commit.

3. **Tolérance à l'incohérence en lecture**
   Les vues peuvent être optimistes.

4. **Aucune fuite d'implémentation**
   Les utilisateurs finaux ne voient jamais les détails internes.

5. **Traçabilité complète interne**
   Les logs contiennent tout.

6. **Pas de surbooking**
   Jamais.

7. **Temps serveur comme autorité**
   Une seule horloge fait foi.

---

## 2. Modèle conceptuel v2

### 2.1 Resource

Une entité réservable.

- `resource_id`
- `type`
- `capacity`
- `version`
- `state`

Aucune sémantique métier embarquée.

---

### 2.2 Availability View (lecture)

Vue calculée, potentiellement en cache.

- Peut être obsolète
- Peut mentir temporairement
- N'engage jamais le moteur

Objectif : performance et UX.

---

### 2.3 Reservation Commit (écriture)

Action atomique, fortement consistante.

- Reçoit une demande
- Vérifie la capacité réelle
- Arbitre selon le temps serveur
- Accepte ou refuse

Tout se joue ici.

---

### 2.4 Waiting List (optionnelle)

Feature activable par ressource.

- Liste ordonnée par temps serveur
- Aucun droit garanti
- Notification quand capacité libérée
- Pas de promesse contractuelle

---

## 3. Cycle de vie simplifié

1. Client lit la disponibilité (vue optimiste)
2. Client tente une réservation
3. Le moteur :
   - calcule sur l'état réel
   - tranche
4. Résultat :
   - succès → réservation confirmée
   - échec → refus clair
5. Event interne généré
6. Notifications éventuelles

Aucun état intermédiaire exposé publiquement.

---

## 4. Gestion de la concurrence

### 4.1 Arbitrage

- Temps serveur strict
- Ordonnancement déterministe
- Un seul gagnant par capacité

Deux requêtes dans la même milliseconde :

- ordre interne stable
- décision reproductible

---

### 4.2 Échecs

Un échec est **normal**, pas une exception.

Codes fonctionnels simples :

- `RESOURCE_FULL`
- `RESOURCE_CLOSED`
- `INVALID_STATE`

Pas d'explication détaillée côté client.

---

## 5. Consistance et cache

### Lecture

- Cache autorisé
- TTL configurable
- Vues approximatives acceptées

### Écriture

- Pas de cache
- Vérification directe sur l'état source
- Atomicité stricte

La seule promesse utilisateur est au moment du commit.

---

## 6. Logs et observabilité

### Ce que voit l'utilisateur

- Succès ou échec
- Message générique
- État final

### Ce que voit l'opérateur

- Timeline complète
- Timestamps serveur
- Versions
- Raisons exactes de refus
- Ordre des requêtes concurrentes

Le moteur est **debuggable par design**.

---

## 7. API (conceptuelle)

### Lecture

```
GET /availability?resource_id=
```

Retour :

- état approximatif
- capacité restante estimée

---

### Écriture

```
POST /reservations
```

Entrée :

- resource_id
- quantity
- client_id

Sortie :

- CONFIRMED
- REJECTED

---

### Waiting list

```
POST /waiting-list/join
```

Optionnel, configurable.

---

## 8. Règles et configuration

Pas de DSL complexe en v2.

Règles simples :

- capacité max
- fenêtre temporelle
- activation waiting list

Les règles sont :

- déclaratives
- versionnées
- appliquées au commit

---

## 9. Ce que le produit ne fait pas (important)

- pas de paiement
- pas de billet
- pas de seat map
- pas de marketplace
- pas de synchronisation multi-systèmes
- pas de compensation post-surbooking

Ces couches vivent ailleurs.

---

## 10. Cas cibles assumés

### Oui

- meetups
- formations
- restaurants
- clubs
- transports locaux
- événements B2B

### Non

- concerts mondiaux
- ventes flash massives
- loteries
- yield management complexe

---

## 11. Extension naturelle (future, pas v2)

- quotas et droits temporaires
- accès conditionnel
- fenêtres dynamiques
- priorités par type de client
- batch admin contrôlé

Mais pas maintenant.

---

## 12. Résumé brutal

Tu construis :

- un moteur simple
- autoritaire
- cohérent
- compréhensible
- limité volontairement

Ce n'est pas sexy par excès de features.
C'est solide par clarté de décisions.
