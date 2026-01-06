"""
Script de test pour vérifier la mise à jour automatique du classement de poule
"""
import sys
from sqlalchemy.orm import Session
from app.db import SessionLocal, init_db
from app.models.tournament import Tournament
from app.models.tournamentphase import TournamentPhase
from app.models.pool import Pool
from app.models.team import Team
from app.models.sport import Sport
from app.models.teamsport import TeamSport
from app.models.teampool import TeamPool
from app.models.match import Match
from app.models.user import User
from datetime import datetime
from app.services.match_service import MatchService

def test_pool_rankings():
    """Teste la mise à jour automatique du classement de poule"""
    db = SessionLocal()
    
    try:
        # 1. Créer un utilisateur de test
        user = db.query(User).filter(User.id == 1).first()
        if not user:
            user = User(
                id=1,
                username="admin",
                email="admin@test.com",
                password_hash="test",
                role="admin"
            )
            db.add(user)
            db.flush()
        
        # 2. Créer un tournoi
        tournament = Tournament(
            name="Test Tournament",
            description="Tournoi de test",
            created_by_user_id=user.id
        )
        db.add(tournament)
        db.flush()
        print(f"✓ Tournoi créé: {tournament.id}")
        
        # 3. Créer une phase
        phase = TournamentPhase(
            tournament_id=tournament.id,
            phase_type="pools",
            phase_order=1
        )
        db.add(phase)
        db.flush()
        print(f"✓ Phase créée: {phase.id}")
        
        # 4. Créer des sports
        sport = db.query(Sport).filter(Sport.name == "Football").first()
        if not sport:
            sport = Sport(name="Football")
            db.add(sport)
            db.flush()
        print(f"✓ Sport: {sport.id}")
        
        # 5. Créer une poule
        pool = Pool(
            phase_id=phase.id,
            name="Poule A",
            order=1,
            qualified_to_finals=2,
            qualified_to_loser_bracket=0
        )
        db.add(pool)
        db.flush()
        print(f"✓ Poule créée: {pool.id}")
        
        # 6. Créer 4 équipes de test
        teams = []
        for i in range(1, 5):
            team_name = f"Équipe {i}"
            team = db.query(Team).filter(Team.name == team_name).first()
            if not team:
                team = Team(name=team_name)
                db.add(team)
            teams.append(team)
        db.flush()
        print(f"✓ {len(teams)} équipes créées")
        
        # 7. Créer des TeamSport et TeamPool
        team_sports = []
        for i, team in enumerate(teams):
            ts = TeamSport(team_id=team.id, sport_id=sport.id)
            db.add(ts)
            db.flush()
            team_sports.append(ts)
            
            # Créer la relation TeamPool
            tp = TeamPool(pool_id=pool.id, team_id=team.id)
            db.add(tp)
        db.flush()
        print(f"✓ {len(team_sports)} TeamSport créés")
        
        # 8. Créer des matchs de test
        matches_data = [
            (0, 1, 2, 1),  # Équipe 0 vs Équipe 1: 2-1
            (2, 3, 1, 1),  # Équipe 2 vs Équipe 3: 1-1
            (0, 2, 3, 0),  # Équipe 0 vs Équipe 2: 3-0
            (1, 3, 2, 0),  # Équipe 1 vs Équipe 3: 2-0
            (0, 3, 1, 0),  # Équipe 0 vs Équipe 3: 1-0
            (1, 2, 0, 2),  # Équipe 1 vs Équipe 2: 0-2
        ]
        
        for team_a_idx, team_b_idx, score_a, score_b in matches_data:
            match = Match(
                phase_id=phase.id,
                pool_id=pool.id,
                match_type="pool",
                team_sport_a_id=team_sports[team_a_idx].id,
                team_sport_b_id=team_sports[team_b_idx].id,
                score_a=score_a,
                score_b=score_b,
                status="completed",
                created_by_user_id=user.id
            )
            db.add(match)
        db.flush()
        print(f"✓ {len(matches_data)} matchs créés et terminés")
        
        # 9. Mettre à jour le classement de la poule
        print("\n🔄 Mise à jour du classement...")
        match_service = MatchService(db)
        match_service.update_pool_rankings(pool.id)
        print("✓ Classement mis à jour")
        
        # 10. Afficher les résultats
        print("\n📊 Classement final de la Poule A:")
        print("-" * 80)
        team_pools = db.query(TeamPool).filter(
            TeamPool.pool_id == pool.id
        ).order_by(TeamPool.position).all()
        
        for tp in team_pools:
            print(f"{tp.position}. {tp.team.name:15} | "
                  f"Pts: {tp.points:2} | "
                  f"J: {tp.wins + tp.losses + tp.draws} | "
                  f"G: {tp.wins} | "
                  f"N: {tp.draws} | "
                  f"P: {tp.losses} | "
                  f"BM: {tp.goals_for} | "
                  f"BE: {tp.goals_against} | "
                  f"Diff: {tp.goal_difference:+3}")
        
        print("\n✅ Test réussi!")
        
        # Vérifier les résultats attendus
        expected = [
            ("Équipe 0", 9),  # 3 victoires
            ("Équipe 1", 6),  # 2 victoires
            ("Équipe 2", 3),  # 1 victoire
            ("Équipe 3", 1),  # 1 nul
        ]
        
        all_correct = True
        for i, (expected_name, expected_points) in enumerate(expected):
            actual_tp = team_pools[i]
            if actual_tp.team.name != expected_name or actual_tp.points != expected_points:
                print(f"❌ Erreur à la position {i+1}: "
                      f"attendu {expected_name} ({expected_points} pts), "
                      f"obtenu {actual_tp.team.name} ({actual_tp.points} pts)")
                all_correct = False
        
        if all_correct:
            print("✅ Tous les résultats sont corrects!")
        else:
            print("❌ Certains résultats sont incorrects")
            return False
        
        return True
        
    except Exception as e:
        print(f"❌ Erreur: {str(e)}")
        import traceback
        traceback.print_exc()
        return False
    finally:
        db.close()

if __name__ == "__main__":
    success = test_pool_rankings()
    sys.exit(0 if success else 1)
