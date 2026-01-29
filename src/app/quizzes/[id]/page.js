'use client';

import { useState, useEffect, useRef } from 'react';
import { supabase } from '../../../utils/supabase';
import { useAuth } from '../../../context/AuthContext';
import { useParams, useRouter } from 'next/navigation';
import { Clock, Send, CheckCircle, XCircle, ChevronRight, Award } from 'lucide-react';
import styles from './QuizView.module.css';

export default function QuizViewPage() {
    const { id: quizId } = useParams();
    const { user } = useAuth();
    const router = useRouter();
    const [loading, setLoading] = useState(true);
    const [quiz, setQuiz] = useState(null);
    const [questions, setQuestions] = useState([]);
    const [currentQ, setCurrentQ] = useState(0);
    const [answers, setAnswers] = useState({});
    const [started, setStarted] = useState(false);
    const [finished, setFinished] = useState(false);
    const [score, setScore] = useState(0);
    const [timeLeft, setTimeLeft] = useState(null);
    const timerRef = useRef(null);

    useEffect(() => {
        if (quizId) fetchQuiz();
    }, [quizId]);

    const fetchQuiz = async () => {
        const { data: qData } = await supabase.from('quizzes').select('*').eq('id', quizId).single();
        const { data: questData } = await supabase.from('questions').select('*').eq('quiz_id', quizId);

        setQuiz(qData);
        setQuestions(questData || []);
        if (qData.time_limit) setTimeLeft(qData.time_limit * 60);
        setLoading(false);
    };

    const startQuiz = () => {
        setStarted(true);
        if (timeLeft) {
            timerRef.current = setInterval(() => {
                setTimeLeft(prev => {
                    if (prev <= 1) {
                        finishQuiz();
                        return 0;
                    }
                    return prev - 1;
                });
            }, 1000);
        }
    };

    const finishQuiz = async () => {
        if (timerRef.current) clearInterval(timerRef.current);

        let correctCount = 0;
        questions.forEach(q => {
            if (answers[q.id]?.toLowerCase() === q.correct_answer?.toLowerCase()) {
                correctCount++;
            }
        });

        const finalScore = (correctCount / questions.length) * 100;
        setScore(finalScore.toFixed(1));
        setFinished(true);

        // Save attempt
        await supabase.from('quiz_attempts').insert([{
            student_id: user.id,
            quiz_id: quizId,
            score: finalScore,
            total_points: questions.length,
            answers: answers,
            completed_at: new Date()
        }]);
    };

    const handleAnswer = (val) => {
        setAnswers({ ...answers, [questions[currentQ].id]: val });
    };

    const formatTime = (seconds) => {
        const m = Math.floor(seconds / 60);
        const s = seconds % 60;
        return `${m}:${s < 10 ? '0' : ''}${s}`;
    };

    if (loading) return <div className={styles.loading}>Preparing Quiz...</div>;

    if (!started) {
        return (
            <div className={styles.container}>
                <div className={`${styles.startCard} glass`}>
                    <Award size={64} className={styles.awardIcon} />
                    <h1>{quiz.title}</h1>
                    <p>{quiz.description}</p>
                    <div className={styles.quizInfo}>
                        <span>{questions.length} Questions</span>
                        {quiz.time_limit && <span>{quiz.time_limit} Minutes</span>}
                    </div>
                    <button onClick={startQuiz} className={`${styles.startBtn} btn-primary`}>Start Quiz</button>
                    <button onClick={() => router.push('/quizzes')} className={`${styles.backBtn} btn-secondary`}>Cancel</button>
                </div>
            </div>
        );
    }

    if (finished) {
        return (
            <div className={styles.container}>
                <div className={`${styles.resultCard} glass`}>
                    <div className={styles.scoreCircle}>
                        <span className={styles.scoreNum}>{score}%</span>
                        <span className={styles.scoreText}>Your Result</span>
                    </div>
                    <h2>Nice Effort!</h2>
                    <p>You've completed <strong>{quiz.title}</strong>.</p>
                    <button onClick={() => router.push('/quizzes')} className={`${styles.startBtn} btn-primary`}>Return to Hub</button>
                </div>
            </div>
        );
    }

    const q = questions[currentQ];

    return (
        <div className={styles.container}>
            <div className={styles.header}>
                <div className={styles.progress}>
                    <span>Question {currentQ + 1} of {questions.length}</span>
                    <div className={styles.progressBar}>
                        <div
                            className={styles.progressFill}
                            style={{ width: `${((currentQ + 1) / questions.length) * 100}%` }}
                        />
                    </div>
                </div>
                {timeLeft !== null && (
                    <div className={`${styles.timer} ${timeLeft < 60 ? styles.timerWarning : ''}`}>
                        <Clock size={18} /> {formatTime(timeLeft)}
                    </div>
                )}
            </div>

            <div className={`${styles.questionCard} glass`}>
                <h2 className={styles.questionText}>{q.question_text}</h2>

                <div className={styles.optionsList}>
                    {q.type === 'multiple_choice' && q.options.map((opt, idx) => (
                        <button
                            key={idx}
                            className={`${styles.optionBtn} ${answers[q.id] === opt ? styles.selected : ''}`}
                            onClick={() => handleAnswer(opt)}
                        >
                            <span className={styles.optionLetter}>{String.fromCharCode(65 + idx)}</span>
                            {opt}
                        </button>
                    ))}

                    {q.type === 'boolean' && (
                        <div className={styles.boolList}>
                            <button
                                className={`${styles.optionBtn} ${answers[q.id] === 'true' ? styles.selected : ''}`}
                                onClick={() => handleAnswer('true')}
                            >True</button>
                            <button
                                className={`${styles.optionBtn} ${answers[q.id] === 'false' ? styles.selected : ''}`}
                                onClick={() => handleAnswer('false')}
                            >False</button>
                        </div>
                    )}

                    {q.type === 'text' && (
                        <input
                            className={styles.textInput}
                            placeholder="Type your answer here..."
                            value={answers[q.id] || ''}
                            onChange={(e) => handleAnswer(e.target.value)}
                        />
                    )}
                </div>
            </div>

            <div className={styles.footer}>
                {currentQ < questions.length - 1 ? (
                    <button
                        onClick={() => setCurrentQ(currentQ + 1)}
                        className={`${styles.nextBtn} btn-secondary`}
                        disabled={!answers[q.id]}
                    >
                        Next <ChevronRight size={18} />
                    </button>
                ) : (
                    <button
                        onClick={finishQuiz}
                        className={`${styles.finishBtn} btn-primary`}
                        disabled={!answers[q.id]}
                    >
                        Submit Results <Send size={18} />
                    </button>
                )}
            </div>
        </div>
    );
}
