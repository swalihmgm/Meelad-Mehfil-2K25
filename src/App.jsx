import React, { useState, useEffect, useMemo } from 'react';

// --- MOCK DATA & HELPERS ---
// In a real app, this would come from a backend/API connected to Google Sheets
const MOCK_ADMIN_CREDS = { email: 'meeladmehfil@2025.com', password: 'meeladmehfil' };
const GOOGLE_SHEET_QUIZ_URL = 'https://docs.google.com/spreadsheets/d/e/2PACX-1vRDauFHl4Oddzupn2bC0PbayXrncq4R0zHP6JGxBzGSzx-Wn6ZW4OP-VBBe-NBF-n7K10Me64ydi5C3/pub?output=csv';
const GOOGLE_SHEET_DEMO_QUIZ_URL = 'https://docs.google.com/spreadsheets/d/e/2PACX-1vQ4DzVrw2siEz6YQvb4bkfpmRIRbKcYQzsNyItErh0jdb5rdSAAMt7Tv0adk9o3SswspvlkMC9BTs4J/pub?output=csv';
const GOOGLE_SHEET_USERS_URL = 'https://docs.google.com/spreadsheets/d/e/2PACX-1vRjS7naJ57vdLOHdSvUpUXNyotANcl9b4jHE5SUolPLPLjvSBPzjaq6gph605JGKjGI51OzR4OO7ywq/pub?output=csv';


// Helper to parse CSV data
const parseCSV = (csvText) => {
  if (!csvText) return [];
  const lines = csvText.trim().split('\n');
  const headers = lines[0].split(',').map(h => h.trim().replace(/"/g, ''));
  return lines.slice(1).map(line => {
    // This regex handles commas inside quoted fields
    const values = line.match(/(".*?"|[^",\r]+)(?=\s*,|\s*$)/g) || [];
    return headers.reduce((obj, header, index) => {
      const value = (values[index] || '').trim().replace(/\r$/, '');
      // Remove quotes from start and end if they exist
      obj[header] = value.startsWith('"') && value.endsWith('"') ? value.slice(1, -1) : value;
      return obj;
    }, {});
  });
};


// --- ICONS ---
// This is now an image-based logo. See instructions after the code block.
const LogoIcon = ({ className }) => (
    <img src="/logo.png" alt="Logo" className={className} />
);

const BackIcon = () => <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-6 h-6"><path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5L8.25 12l7.5-7.5" /></svg>;
const LogoutIcon = () => <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-6 h-6"><path strokeLinecap="round" strokeLinejoin="round" d="M15.75 9V5.25A2.25 2.25 0 0013.5 3h-6a2.25 2.25 0 00-2.25 2.25v13.5A2.25 2.25 0 007.5 21h6a2.25 2.25 0 002.25-2.25V15m3 0l3-3m0 0l-3-3m3 3H9" /></svg>;

// --- MAIN APP COMPONENT (Router) ---
export default function App() {
  const [page, setPage] = useState('splash'); // splash, login, dashboard, content, quiz, adminLogin, adminDashboard
  const [user, setUser] = useState(null);
  const [admin, setAdmin] = useState(null);
  const [pageContext, setPageContext] = useState(null); // Can hold day number or quiz type

  // Check for logged-in user on initial load
  useEffect(() => {
    const storedUser = localStorage.getItem('quizAppUser');
    if (storedUser) {
      setUser(JSON.parse(storedUser));
      setPage('dashboard');
    }
    const storedAdmin = localStorage.getItem('quizAppAdmin');
    if(storedAdmin){
        setAdmin(JSON.parse(storedAdmin));
        setPage('adminDashboard');
    }
  }, []);

  const handleUserLogin = async (name, password) => {
    try {
        const response = await fetch(GOOGLE_SHEET_USERS_URL);
        if (!response.ok) throw new Error('Could not fetch user list');
        const csvText = await response.text();
        const users = parseCSV(csvText);
        
        const isValidUser = users.some(
            u => u.Name && u.Password && u.Name.toLowerCase() === name.toLowerCase() && u.Password === password
        );

        if (isValidUser) {
            const userData = { name, password };
            setUser(userData);
            localStorage.setItem('quizAppUser', JSON.stringify(userData));
            setPage('dashboard');
            return true;
        } else {
            return false;
        }
    } catch (error) {
        console.error("Login validation failed:", error);
        return false; // Fail safely
    }
  };

  const handleUserLogout = () => {
    setUser(null);
    localStorage.removeItem('quizAppUser');
    setPage('login');
  };
  
  const handleAdminLogin = (email, password) => {
    if (email === MOCK_ADMIN_CREDS.email && password === MOCK_ADMIN_CREDS.password) {
        const adminData = { email };
        setAdmin(adminData);
        localStorage.setItem('quizAppAdmin', JSON.stringify(adminData));
        setPage('adminDashboard');
        return true;
    }
    return false;
  };
    
  const handleAdminLogout = () => {
    setAdmin(null);
    localStorage.removeItem('quizAppAdmin');
    setPage('adminLogin');
  };

  const navigateTo = (pageName, context = null) => {
    setPageContext(context);
    setPage(pageName);
  };

  const renderPage = () => {
    switch (page) {
      case 'splash':
        return <SplashScreen onFinish={() => setPage(user ? 'dashboard' : 'login')} />;
      case 'login':
        return <LoginPage onLogin={handleUserLogin} onAdminNav={() => navigateTo('adminLogin')} />;
      case 'dashboard':
        return <UserDashboard user={user} onLogout={handleUserLogout} onNavigate={navigateTo} />;
      case 'content':
        return <ContentPage day={pageContext} user={user} onBack={() => navigateTo('dashboard')} onLogout={handleUserLogout} />;
      case 'quiz':
        return <QuizPage user={user} quizType={pageContext} onBack={() => navigateTo('dashboard')} onLogout={handleUserLogout} />;
      case 'adminLogin':
        return <AdminLoginPage onLogin={handleAdminLogin} onUserNav={() => navigateTo('login')} />;
      case 'adminDashboard':
        return <AdminDashboard onLogout={handleAdminLogout} />;
      default:
        return <SplashScreen onFinish={() => setPage(user ? 'dashboard' : 'login')} />;
    }
  };

  return (
    <>
      <style>
        {`
          @import url('https://fonts.googleapis.com/css2?family=Manjari:wght@400;700&display=swap');
          .font-malayalam {
            font-family: 'Manjari', sans-serif;
          }
        `}
      </style>
      <div className="bg-[#041800] min-h-screen flex justify-center items-center p-0 sm:p-4">
        <div className="w-full h-screen sm:max-w-sm sm:h-screen bg-gray-100 text-gray-800 shadow-2xl overflow-hidden relative font-sans sm:rounded-3xl">
          {renderPage()}
        </div>
      </div>
    </>
  );
}

// --- USER-SIDE COMPONENTS ---

const SplashScreen = ({ onFinish }) => {
  useEffect(() => {
    const timer = setTimeout(() => {
      onFinish();
    }, 5000);
    return () => clearTimeout(timer);
  }, [onFinish]);

  return (
    <div className="relative flex items-center justify-center min-h-full bg-black">
      <img 
        src="/openingPhoto.jpg" 
        alt="Welcome background" 
        className="absolute top-0 left-0 w-full h-full object-cover"
      />
    </div>
  );
};

const LoginPage = ({ onLogin, onAdminNav }) => {
  const [name, setName] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!name.trim() || !password.trim()) return;

    setIsLoading(true);
    setError('');
    
    const success = await onLogin(name.trim(), password.trim());

    if (!success) {
      setError('Invalid details or user not found. Please check your name and password.');
    }
    
    setIsLoading(false);
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-full p-4">
       <LogoIcon className="w-24 h-24 mb-6" />
      <h2 className="text-3xl font-bold mb-6 text-center">User Login</h2>
      <div className="w-full max-w-sm p-8 bg-white rounded-2xl shadow-lg">
        <form onSubmit={handleSubmit} className="space-y-6">
          {error && <p className="text-red-500 text-sm text-center">{error}</p>}
          <div>
            <label htmlFor="name" className="block text-sm font-medium text-gray-700">Name</label>
            <input
              id="name"
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              className="mt-1 block w-full px-4 py-3 bg-gray-50 border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-[#b8c400]"
              placeholder="Enter your name"
            />
          </div>
          <div>
            <label htmlFor="password" className="block text-sm font-medium text-gray-700">Password</label>
            <input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              className="mt-1 block w-full px-4 py-3 bg-gray-50 border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-[#b8c400]"
              placeholder="Enter your password"
            />
          </div>
          <button
            type="submit"
            disabled={isLoading}
            className="w-full flex justify-center py-3 px-4 border border-transparent rounded-lg shadow-sm text-sm font-medium text-white bg-[#b8c400] hover:opacity-90 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#b8c400] transition-transform transform hover:scale-105 disabled:bg-gray-400 disabled:cursor-not-allowed"
          >
            {isLoading ? 'Verifying...' : 'Login'}
          </button>
        </form>
      </div>
       <button onClick={onAdminNav} className="mt-6 text-sm text-[#b8c400] hover:underline">
        Switch to Admin Login
      </button>
    </div>
  );
};

const Navbar = ({ onBack, onLogout, showBackButton = false }) => {
  return (
    <nav className="fixed top-0 left-0 right-0 sm:absolute max-w-sm mx-auto bg-white shadow-md h-16 flex items-center justify-between px-4 z-50">
      <div>
        {showBackButton && (
          <button onClick={onBack} className="p-2 rounded-full hover:bg-gray-200">
            <BackIcon />
          </button>
        )}
      </div>
      <div className="absolute left-1/2 -translate-x-1/2">
        <LogoIcon className="h-10 w-10" />
      </div>
      <div className="flex items-center space-x-2">
        <button onClick={onLogout} className="p-2 rounded-full hover:bg-gray-200">
          <LogoutIcon />
        </button>
      </div>
    </nav>
  );
};

const UserDashboard = ({ user, onLogout, onNavigate }) => {
    const [days, setDays] = useState([]);
    const [leaderboard, setLeaderboard] = useState([]);
    const [showLeaderboard, setShowLeaderboard] = useState(false);
    const [isQuizEnabled, setIsQuizEnabled] = useState(false);
    const [hasAttemptedQuiz, setHasAttemptedQuiz] = useState(false);
    const [googleFormUrl, setGoogleFormUrl] = useState('');
    const [isGoogleFormEnabled, setIsGoogleFormEnabled] = useState(false);

    useEffect(() => {
        const allDays = [];
        for (let i = 0; i < localStorage.length; i++) {
            const key = localStorage.key(i);
            const match = key.match(/^day_(\d+)_content$/);
            if (match) {
                const dayNumber = parseInt(match[1], 10);
                const content = JSON.parse(localStorage.getItem(key));
                allDays.push({ day: dayNumber, date: content.date || '' });
            }
        }
        allDays.sort((a, b) => a.day - b.day);
        setDays(allDays);

        const isLeaderboardVisible = localStorage.getItem('leaderboardVisible') === 'true';
        setShowLeaderboard(isLeaderboardVisible);
        
        const isQuizVisible = localStorage.getItem('quizVisible') === 'true';
        setIsQuizEnabled(isQuizVisible);

        const attempted = localStorage.getItem(`quiz_attempted_${user.name}_${user.password}`) === 'true';
        setHasAttemptedQuiz(attempted);

        setGoogleFormUrl(localStorage.getItem('googleFormQuizUrl') || '');
        setIsGoogleFormEnabled(localStorage.getItem('googleFormQuizVisible') === 'true');

        if (isLeaderboardVisible) {
            const results = JSON.parse(localStorage.getItem('quizResults') || '[]');
            const sortedResults = results.sort((a, b) => b.score - a.score);
            setLeaderboard(sortedResults);
        }
    }, [user.name, user.password]);

  return (
    <div className="pt-20 pb-4 px-4 overflow-y-auto h-full">
      <Navbar onLogout={onLogout} />
      <header className="text-center mb-8">
        <h1 className="text-3xl font-bold">Welcome, {user.name}!</h1>
        <p className="text-gray-500 font-malayalam text-lg">മീലാദ് മെഹ്ഫിൽ 2K25</p>
      </header>
      <div className="flex flex-col gap-4">
        {days.map(({ day, date }) => (
          <div
            key={day}
            onClick={() => onNavigate('content', day)}
            className="bg-white rounded-2xl shadow-lg p-6 text-center transform transition-transform duration-300 cursor-pointer hover:-translate-y-1"
          >
            <h3 className="text-xl font-bold text-[#b8c400]">
              Day {day}
            </h3>
            <p className="mt-2 text-sm text-gray-600">
              {date || 'Learning Content'}
            </p>
          </div>
        ))}
        {/* Special Quiz Card */}
        <div
          onClick={() => (!hasAttemptedQuiz && isQuizEnabled) && onNavigate('quiz', 'main')}
          className={`rounded-2xl shadow-lg p-6 text-center transform transition-transform duration-300 border-b-4 ${(!isQuizEnabled || hasAttemptedQuiz) ? 'opacity-60 cursor-not-allowed bg-gray-300 border-gray-400' : 'cursor-pointer hover:-translate-y-1 bg-gradient-to-br from-[#b8c400] to-[#041800] text-white border-yellow-600'}`}
        >
          <h3 className="text-xl font-bold font-malayalam">
            മെഗാ ക്വിസ്
          </h3>
          <p className="mt-2 text-sm">
            {hasAttemptedQuiz ? 'Completed' : isQuizEnabled ? 'Click to Start' : 'Not yet available'}
          </p>
        </div>
        {/* Demo Quiz Card */}
        <div
          onClick={() => onNavigate('quiz', 'demo')}
          className="rounded-2xl shadow-lg p-6 text-center transform transition-transform duration-300 cursor-pointer hover:-translate-y-1 bg-gradient-to-br from-[#b8c400] to-[#041800] text-white border-b-4 border-yellow-600"
        >
          <h3 className="text-xl font-bold">
            Demo Quiz
          </h3>
          <p className="mt-2 text-sm">
            Practice anytime
          </p>
        </div>
        {/* Google Form Quiz Card */}
        {isGoogleFormEnabled && googleFormUrl && (
            <div
              onClick={() => window.open(googleFormUrl, '_blank')}
              className="rounded-2xl shadow-lg p-6 text-center transform transition-transform duration-300 cursor-pointer hover:-translate-y-1 bg-gradient-to-br from-[#b8c400] to-[#041800] text-white border-b-4 border-yellow-600"
            >
              <h3 className="text-xl font-bold">
                External Quiz
              </h3>
              <p className="mt-2 text-sm">
                Take the Google Form quiz
              </p>
            </div>
        )}
      </div>

       {showLeaderboard && (
          <div className="mt-12">
              <h2 className="text-3xl font-bold text-center mb-6">Leaderboard</h2>
              {leaderboard.length > 0 ? (
                  <div className="max-w-2xl mx-auto bg-white rounded-2xl shadow-lg p-4">
                      <ul className="space-y-2">
                          <li className="flex justify-between items-center p-2 font-bold border-b">
                              <span className="w-1/6 text-center">Rank</span>
                              <span className="w-3/6">Name</span>
                              <span className="w-2/6 text-right">Points</span>
                          </li>
                          {leaderboard.map((result, index) => (
                              <li key={index} className="flex justify-between items-center p-2 bg-gray-50 rounded-lg">
                                  <span className="w-1/6 text-center font-bold">{index + 1}</span>
                                  <span className="w-3/6 font-semibold text-sm truncate">{result.name}</span>
                                  <span className="w-2/6 text-right font-bold text-[#b8c400]">{result.score}</span>
                              </li>
                          ))}
                      </ul>
                  </div>
              ) : (
                  <p className="text-center text-gray-500">Results are not yet published.</p>
              )}
          </div>
      )}
    </div>
  );
};

const ContentPage = ({ day, user, onBack, onLogout }) => {
  const contentKey = `day_${day}_content`;
  const notesKey = `day_${day}_notes_${user.name}_${user.password}`;
  const [content, setContent] = useState(JSON.parse(localStorage.getItem(contentKey) || '{}'));
  const [notes, setNotes] = useState(localStorage.getItem(notesKey) || '');
  
  const getYouTubeEmbedUrl = (url) => {
    try {
      const urlObj = new URL(url);
      if (urlObj.hostname === 'youtu.be') {
        return `https://www.youtube.com/embed/${urlObj.pathname.slice(1)}`;
      }
      if (urlObj.hostname === 'www.youtube.com' || urlObj.hostname === 'youtube.com') {
        const videoId = urlObj.searchParams.get('v');
        if (videoId) return `https://www.youtube.com/embed/${videoId}`;
      }
    } catch (error) {
      console.error("Invalid YouTube URL", error);
    }
    return null;
  };

  return (
    <div className="pt-20 pb-4 px-4 max-w-4xl mx-auto h-full overflow-y-auto">
      <Navbar onBack={onBack} onLogout={onLogout} showBackButton />
      <h1 className="text-4xl font-bold text-center mb-2">Day {day}</h1>
      <p className="text-center text-gray-500 mb-6">{content.date}</p>
      
      <div className="bg-white rounded-2xl shadow-lg p-4 sm:p-6 mb-8">
        {content.items && content.items.length > 0 ? (
          <div className="space-y-6">
            {content.items.map((item, index) => (
              <div key={index}>
                {item.type === 'youtube' && getYouTubeEmbedUrl(item.url) && (
                  <div className="w-full aspect-video">
                    <iframe
                      src={getYouTubeEmbedUrl(item.url)}
                      title="YouTube video player"
                      frameBorder="0"
                      allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                      allowFullScreen
                      className="w-full h-full rounded-lg"
                    ></iframe>
                  </div>
                )}
                {item.type === 'pdf' && (
                   <div className="text-center p-4 border rounded-lg">
                    <p className="mb-4">PDF Document: {item.url.split('/').pop()}</p>
                    <a 
                      href={item.url} 
                      target="_blank" 
                      rel="noopener noreferrer" 
                      className="inline-block bg-[#b8c400] text-white px-6 py-2 rounded-lg shadow-md hover:opacity-90 transition-colors"
                    >
                        Open PDF
                    </a>
                  </div>
                )}
                 {item.type === 'pdf_upload' && (
                    <div className="text-center p-4 border rounded-lg">
                        <p className="mb-4">Uploaded PDF: {item.name}</p>
                        <a 
                          href={item.dataUrl} 
                          target="_blank" 
                          rel="noopener noreferrer" 
                          className="inline-block bg-[#b8c400] text-white px-6 py-2 rounded-lg shadow-md hover:opacity-90 transition-colors"
                        >
                            View Uploaded PDF
                        </a>
                    </div>
                )}
                {item.type === 'audio_upload' && (
                    <div className="p-2 border rounded-lg">
                        <p className="mb-2 text-sm font-semibold">{item.name}</p>
                        <audio controls src={item.dataUrl} className="w-full"></audio>
                    </div>
                )}
              </div>
            ))}
          </div>
        ) : (
          <p className="text-center text-gray-500">Content for Day {day} has not been added yet.</p>
        )}
      </div>

      <div className="bg-white rounded-2xl shadow-lg p-4 sm:p-6">
        <h2 className="text-2xl font-bold mb-4">Write your notes</h2>
        <textarea
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          placeholder="Type your notes here... they will be saved automatically."
          className="w-full h-48 p-4 bg-gray-50 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#b8c400]"
        ></textarea>
      </div>
    </div>
  );
};

const QuizPage = ({ user, quizType, onBack, onLogout }) => {
    const [questions, setQuestions] = useState([]);
    const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
    const [userAnswers, setUserAnswers] = useState({});
    const [questionTimeLeft, setQuestionTimeLeft] = useState(45);
    const [quizFinished, setQuizFinished] = useState(false);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState(null);

    const handleSubmit = React.useCallback(() => {
        if (quizType === 'main') {
            let score = 0;
            questions.forEach((q, index) => {
                if (userAnswers[index] === q.correctAnswer) {
                    score++;
                }
            });

            const result = {
                name: user.name,
                password: user.password,
                score: score,
                timestamp: new Date().toISOString()
            };

            const existingResults = JSON.parse(localStorage.getItem('quizResults') || '[]');
            localStorage.setItem('quizResults', JSON.stringify([...existingResults, result]));
            localStorage.setItem(`quiz_attempted_${user.name}_${user.password}`, 'true');
        }
        setQuizFinished(true);
    }, [quizType, questions, userAnswers, user.name, user.password]);

    const goToNextQuestion = React.useCallback(() => {
        if (currentQuestionIndex < questions.length - 1) {
            setCurrentQuestionIndex(prev => prev + 1);
        } else {
            handleSubmit();
        }
    }, [currentQuestionIndex, questions.length, handleSubmit]);

    useEffect(() => {
        const fetchQuestions = async () => {
            setIsLoading(true);
            setError(null);
            
            try {
                let parsedQuestions;
                if (quizType === 'main') {
                    const storedQuestionsCSV = localStorage.getItem('quizCSV');
                    if (storedQuestionsCSV) {
                        parsedQuestions = parseCSV(storedQuestionsCSV);
                    } else {
                        const response = await fetch(GOOGLE_SHEET_QUIZ_URL);
                        if (!response.ok) throw new Error('Network response was not ok');
                        const csvText = await response.text();
                        parsedQuestions = parseCSV(csvText);
                    }
                } else { // Demo quiz
                    const response = await fetch(GOOGLE_SHEET_DEMO_QUIZ_URL);
                    if (!response.ok) throw new Error('Network response was not ok');
                    const csvText = await response.text();
                    parsedQuestions = parseCSV(csvText);
                }


                if (!parsedQuestions || parsedQuestions.length === 0) {
                    throw new Error("No questions found.");
                }

                for (let i = parsedQuestions.length - 1; i > 0; i--) {
                    const j = Math.floor(Math.random() * (i + 1));
                    [parsedQuestions[i], parsedQuestions[j]] = [parsedQuestions[j], parsedQuestions[i]];
                }

                const transformed = parsedQuestions.map(q => {
                    const headers = Object.keys(q);
                    const questionText = q[headers[0]];
                    const correctAnswer = q[headers[1]];
                    const incorrectAnswers = headers.slice(2).map(h => q[h]).filter(Boolean);
                    
                    return { questionText, correctAnswer, incorrectAnswers };
                }).filter(q => q.questionText && q.correctAnswer);

                setQuestions(transformed);

            } catch (err) {
                setError('Failed to load quiz questions. Please try again later.');
                console.error(err);
            } finally {
                setIsLoading(false);
            }
        };

        fetchQuestions();
    }, [quizType]);
    
    const currentQuestionData = useMemo(() => {
        if (!questions[currentQuestionIndex]) return null;

        const currentQ = questions[currentQuestionIndex];
        const options = [currentQ.correctAnswer, ...currentQ.incorrectAnswers];
        
        for (let i = options.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [options[i], options[j]] = [options[j], options[i]];
        }

        return {
            questionText: currentQ.questionText,
            options: options,
            correctAnswer: currentQ.correctAnswer
        };
    }, [questions, currentQuestionIndex]);


    useEffect(() => {
        setQuestionTimeLeft(45);
    }, [currentQuestionIndex]);

    useEffect(() => {
        if (questionTimeLeft > 0 && !quizFinished) {
            const timer = setTimeout(() => setQuestionTimeLeft(prev => prev - 1), 1000);
            return () => clearTimeout(timer);
        } else if (questionTimeLeft === 0 && !quizFinished) {
            goToNextQuestion();
        }
    }, [questionTimeLeft, quizFinished, goToNextQuestion]);

    const handleAnswerSelect = (optionText) => {
        setUserAnswers({
            ...userAnswers,
            [currentQuestionIndex]: optionText
        });
    };

    if (quizFinished) {
        return (
            <div className="flex flex-col items-center justify-center min-h-full text-center p-4">
                 <Navbar onBack={onBack} onLogout={onLogout} showBackButton />
                <div className="bg-white p-10 rounded-2xl shadow-lg">
                    <div className="text-6xl mb-4">✅</div>
                    <h1 className="text-3xl font-bold">Responses submitted.</h1>
                    <p className="mt-2 text-gray-500">Results will be published later.</p>
                    <button onClick={onBack} className="mt-6 bg-[#b8c400] text-white px-6 py-2 rounded-lg hover:opacity-90">
                        Back to Dashboard
                    </button>
                </div>
            </div>
        );
    }

    if (isLoading) {
        return (
             <>
                <Navbar onBack={onBack} onLogout={onLogout} showBackButton />
                <div className="relative flex items-center justify-center h-full bg-black">
                  <img 
                    src="/openingPhoto.jpg" 
                    alt="Loading background" 
                    className="absolute top-0 left-0 w-full h-full object-cover animate-pulse"
                  />
                </div>
            </>
        );
    }

    if (error || !currentQuestionData) {
        return (
             <div className="pt-20 pb-4 px-4 text-center">
                <Navbar onBack={onBack} onLogout={onLogout} showBackButton />
                <p>{error || 'Quiz is not available yet.'}</p>
            </div>
        );
    }

    return (
        <div className="pt-20 pb-4 px-4 max-w-3xl mx-auto">
            <Navbar onBack={onBack} onLogout={onLogout} showBackButton />
            <div className="bg-white rounded-2xl shadow-lg p-6">
                <div className="flex justify-between items-center mb-6">
                    <h1 className={`text-2xl font-bold ${quizType === 'main' ? 'font-malayalam' : ''}`}>{quizType === 'main' ? 'മെഗാ ക്വിസ്' : 'Demo Quiz'}</h1>
                    <div className="text-lg font-semibold bg-red-100 text-red-600 px-4 py-1 rounded-full">
                        0:{questionTimeLeft < 10 ? `0${questionTimeLeft}` : questionTimeLeft}
                    </div>
                </div>
                
                <div>
                    <p className="text-base font-medium mb-1">Question {currentQuestionIndex + 1} of {questions.length}</p>
                    <h2 className="text-lg mb-6">{currentQuestionData.questionText}</h2>
                    <div className="grid grid-cols-1 gap-3">
                        {currentQuestionData.options.map((option, index) => (
                            <button
                                key={index}
                                onClick={() => handleAnswerSelect(option)}
                                className={`p-3 rounded-lg text-left transition-colors duration-200 ${
                                    userAnswers[currentQuestionIndex] === option
                                        ? 'bg-[#b8c400] text-white ring-2 ring-green-300'
                                        : 'bg-gray-100 hover:bg-gray-200'
                                }`}
                            >
                                {option}
                            </button>
                        ))}
                    </div>
                </div>

                <div className="flex justify-between items-center mt-6">
                    <button
                        onClick={goToNextQuestion}
                        className="w-full px-6 py-2 bg-blue-500 text-white rounded-lg"
                    >
                        {currentQuestionIndex === questions.length - 1 ? 'Submit' : 'Submit Answer'}
                    </button>
                </div>
            </div>
        </div>
    );
};


// --- ADMIN-SIDE COMPONENTS ---

const AdminLoginPage = ({ onLogin, onUserNav }) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');

  const handleSubmit = (e) => {
    e.preventDefault();
    setError('');
    const success = onLogin(email, password);
    if (!success) {
      setError('Invalid credentials. Please try again.');
    }
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-full p-4">
       <LogoIcon className="w-24 h-24 mb-6" />
      <h2 className="text-3xl font-bold mb-6 text-center">Admin Login</h2>
      <div className="w-full max-w-sm p-8 bg-white rounded-2xl shadow-lg">
        <form onSubmit={handleSubmit} className="space-y-6">
          {error && <p className="text-red-500 text-sm text-center">{error}</p>}
          <div>
            <label htmlFor="email" className="block text-sm font-medium text-gray-700">Email</label>
            <input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="mt-1 block w-full px-4 py-3 bg-gray-50 border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-[#b8c400]"
              placeholder="admin@example.com"
            />
          </div>
          <div>
            <label htmlFor="password" className="block text-sm font-medium text-gray-700">Password</label>
            <input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              className="mt-1 block w-full px-4 py-3 bg-gray-50 border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-[#b8c400]"
              placeholder="password"
            />
          </div>
          <button
            type="submit"
            className="w-full flex justify-center py-3 px-4 border border-transparent rounded-lg shadow-sm text-sm font-medium text-white bg-[#b8c400] hover:opacity-90 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#b8c400] transition-transform transform hover:scale-105"
          >
            Login
          </button>
        </form>
      </div>
      <button onClick={onUserNav} className="mt-6 text-sm text-[#b8c400] hover:underline">
        Switch to User Login
      </button>
    </div>
  );
};

const AdminDashboard = ({ onLogout }) => {
    const [activeTab, setActiveTab] = useState('content');

    return (
        <div className="pt-20 pb-4 px-4 max-w-6xl mx-auto h-full overflow-y-auto">
            <Navbar onLogout={onLogout} />
            <header className="text-center mb-8">
                <h1 className="text-4xl font-bold">Admin Dashboard</h1>
            </header>
            <div className="flex justify-center border-b border-gray-300 mb-8">
                <button onClick={() => setActiveTab('content')} className={`px-2 py-3 text-sm font-semibold ${activeTab === 'content' ? 'text-[#b8c400] border-b-2 border-[#b8c400]' : ''}`}>Content</button>
                <button onClick={() => setActiveTab('quiz')} className={`px-2 py-3 text-sm font-semibold ${activeTab === 'quiz' ? 'text-[#b8c400] border-b-2 border-[#b8c400]' : ''}`}>Quiz</button>
                <button onClick={() => setActiveTab('gform')} className={`px-2 py-3 text-sm font-semibold ${activeTab === 'gform' ? 'text-[#b8c400] border-b-2 border-[#b8c400]' : ''}`}>Google Form</button>
                <button onClick={() => setActiveTab('results')} className={`px-2 py-3 text-sm font-semibold ${activeTab === 'results' ? 'text-[#b8c400] border-b-2 border-[#b8c400]' : ''}`}>Results</button>
            </div>
            <div>
                {activeTab === 'content' && <ContentManager />}
                {activeTab === 'quiz' && <QuizManager />}
                {activeTab === 'gform' && <GoogleFormManager />}
                {activeTab === 'results' && <ResultsManager />}
            </div>
        </div>
    );
};

const ContentManager = ({}) => {
    const [day, setDay] = useState(1);
    const [date, setDate] = useState('');
    const [contentItems, setContentItems] = useState([]);
    const [message, setMessage] = useState('');

    const [newContentType, setNewContentType] = useState('youtube');
    const [newUrl, setNewUrl] = useState('');
    const [newFile, setNewFile] = useState(null);

    useEffect(() => {
        const content = JSON.parse(localStorage.getItem(`day_${day}_content`) || '{}');
        setDate(content.date || '');
        setContentItems(content.items || []);
    }, [day]);

    const handleAddContent = () => {
        if (newContentType.includes('upload') && newFile) {
            const reader = new FileReader();
            reader.onload = (e) => {
                const dataUrl = e.target.result;
                setContentItems([...contentItems, { type: newContentType, name: newFile.name, dataUrl }]);
                setNewFile(null);
                setNewUrl('');
            };
            reader.readAsDataURL(newFile);
        } else if (!newContentType.includes('upload') && newUrl.trim()) {
            setContentItems([...contentItems, { type: newContentType, url: newUrl }]);
            setNewUrl('');
        } else {
            alert('Please provide a URL or select a file to add.');
        }
    };
    
    const handleRemoveItem = (index) => {
        setContentItems(contentItems.filter((_, i) => i !== index));
    };

    const handleSave = () => {
        try {
            localStorage.setItem(`day_${day}_content`, JSON.stringify({ date, items: contentItems }));
            setMessage(`Day ${day} content saved successfully!`);
        } catch (error) {
            if (error.name === 'QuotaExceededError') {
                setMessage('Error: Storage limit exceeded. Please upload smaller files or remove some content.');
            } else {
                setMessage('An error occurred while saving.');
            }
        }
        setTimeout(() => setMessage(''), 5000);
    };

    return (
        <div className="bg-white rounded-2xl shadow-lg p-6">
            <h2 className="text-2xl font-bold mb-6">Manage Daily Content</h2>
            {message && <p className={`mb-4 ${message.startsWith('Error') ? 'text-red-500' : 'text-green-600'}`}>{message}</p>}
            <div className="space-y-4">
                <div>
                    <label className="block text-sm font-medium">Day Number</label>
                    <input type="number" min="1" value={day} onChange={e => setDay(Number(e.target.value) || 1)} className="mt-1 block w-full p-3 bg-gray-50 border border-gray-300 rounded-lg" />
                </div>
                <div>
                    <label className="block text-sm font-medium">Date (e.g., Aug 21)</label>
                    <input type="text" value={date} onChange={e => setDate(e.target.value)} placeholder="Subtitle for the day card" className="mt-1 block w-full p-3 bg-gray-50 border border-gray-300 rounded-lg" />
                </div>
            </div>

            <div className="my-6 border-t pt-4">
                <h3 className="font-semibold mb-2">Current Content Items:</h3>
                {contentItems.length === 0 ? <p className="text-sm text-gray-500">No content added yet.</p> : (
                    <ul className="space-y-2">
                        {contentItems.map((item, index) => (
                            <li key={index} className="flex justify-between items-center bg-gray-100 p-2 rounded">
                                <span className="text-sm truncate">{item.url || item.name}</span>
                                <button onClick={() => handleRemoveItem(index)} className="text-red-500 hover:text-red-700 font-bold text-lg">&times;</button>
                            </li>
                        ))}
                    </ul>
                )}
            </div>

            <div className="space-y-4 border-t pt-4">
                <h3 className="font-semibold">Add New Content:</h3>
                <div>
                    <label className="block text-sm font-medium">Content Type</label>
                    <select value={newContentType} onChange={e => setNewContentType(e.target.value)} className="mt-1 block w-full p-3 bg-gray-50 border border-gray-300 rounded-lg">
                        <option value="youtube">YouTube Link</option>
                        <option value="pdf">PDF Link</option>
                        <option value="pdf_upload">PDF Upload</option>
                        <option value="audio_upload">Audio Upload</option>
                    </select>
                </div>
                {newContentType.includes('upload') ? (
                    <div>
                        <label className="block text-sm font-medium">Upload File</label>
                        <input type="file" onChange={(e) => setNewFile(e.target.files[0])} accept={newContentType === 'pdf_upload' ? '.pdf' : 'audio/*'} className="mt-1 block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-green-50 file:text-green-700 hover:file:bg-green-100"/>
                    </div>
                ) : (
                    <div>
                        <label className="block text-sm font-medium">Content URL</label>
                        <input type="text" value={newUrl} onChange={e => setNewUrl(e.target.value)} placeholder="Enter YouTube or PDF URL" className="mt-1 block w-full p-3 bg-gray-50 border border-gray-300 rounded-lg" />
                    </div>
                )}
                <button onClick={handleAddContent} className="w-full py-2 px-4 bg-blue-600 text-white rounded-lg hover:bg-blue-700">Add Content to List</button>
            </div>

            <button onClick={handleSave} className="w-full mt-6 py-3 px-4 bg-green-600 text-white rounded-lg hover:bg-green-700 font-bold">Save Day's Content</button>
        </div>
    );
};

const QuizManager = ({}) => {
    const [csvData, setCsvData] = useState('');
    const [message, setMessage] = useState('');
    const [isLoading, setIsLoading] = useState(true);
    const [quizVisible, setQuizVisible] = useState(localStorage.getItem('quizVisible') === 'true');
    const [previewQuestions, setPreviewQuestions] = useState([]);

    useEffect(() => {
        const fetchAndSetQuizData = async () => {
            setIsLoading(true);
            const localData = localStorage.getItem('quizCSV');
            if (localData) {
                setCsvData(localData);
                setPreviewQuestions(parseCSV(localData));
                setIsLoading(false);
                return;
            }
            try {
                const response = await fetch(GOOGLE_SHEET_QUIZ_URL);
                const text = await response.text();
                setCsvData(text);
                setPreviewQuestions(parseCSV(text));
            } catch (error) {
                setMessage('Could not fetch quiz data from Google Sheet.');
                console.error(error);
            } finally {
                setIsLoading(false);
            }
        };
        fetchAndSetQuizData();
    }, []);

    const handleSave = () => {
        try {
            const parsed = parseCSV(csvData);
            if (parsed.length > 0 && Object.keys(parsed[0]).length >= 2) {
                 localStorage.setItem('quizCSV', csvData);
                 setMessage('Quiz saved! This will override the Google Sheet for users.');
            } else {
                throw new Error("Invalid CSV format. Requires at least a Question and Answer column.");
            }
        } catch (error) {
            setMessage(`Error: ${error.message}. Please check CSV format.`);
        }
         setTimeout(() => setMessage(''), 5000);
    };

    const handleToggleQuizVisibility = () => {
        const newValue = !quizVisible;
        setQuizVisible(newValue);
        localStorage.setItem('quizVisible', newValue);
    };

    return (
        <div className="bg-white rounded-2xl shadow-lg p-6">
            <div className="flex justify-between items-center mb-6">
                <h2 className="text-2xl font-bold">Manage Quiz</h2>
                <div className="flex items-center">
                    <span className="mr-3 font-medium text-sm">Enable Quiz</span>
                    <button onClick={handleToggleQuizVisibility} className={`px-4 py-2 w-16 text-sm rounded-lg text-white font-semibold transition-colors ${quizVisible ? 'bg-green-600' : 'bg-gray-500'}`}>
                        {quizVisible ? 'ON' : 'OFF'}
                    </button>
                </div>
            </div>
            <p className="text-sm text-gray-500 mb-4">
                The first column should be the Question, the second the correct Answer, and the rest are options.
            </p>
            {message && <p className="mb-4 text-green-600">{message}</p>}
            <textarea
                value={csvData}
                onChange={e => setCsvData(e.target.value)}
                placeholder={isLoading ? 'Loading quiz data...' : 'Enter CSV data here...'}
                className="w-full h-64 p-4 font-mono text-sm bg-gray-50 border border-gray-300 rounded-lg"
                disabled={isLoading}
            ></textarea>
            <button onClick={handleSave} className="mt-4 w-full py-3 px-4 bg-green-600 text-white rounded-lg hover:bg-green-700" disabled={isLoading}>
                Save Quiz (Override)
            </button>

            <div className="mt-8">
                <h3 className="text-xl font-bold mb-4">Quiz Preview</h3>
                {previewQuestions.length > 0 ? (
                    <div className="overflow-x-auto border rounded-lg">
                        <table className="w-full text-left text-sm border-collapse">
                            <thead className="bg-gray-50">
                                <tr>
                                    <th className="p-2 border border-gray-300 font-semibold">Question</th>
                                    <th className="p-2 border border-gray-300 font-semibold">Answer</th>
                                    <th className="p-2 border border-gray-300 font-semibold">Options</th>
                                </tr>
                            </thead>
                            <tbody>
                                {previewQuestions.map((q, index) => {
                                    const headers = Object.keys(q);
                                    return (
                                        <tr key={index} className="border-b">
                                            <td className="p-2 border border-gray-300">{q[headers[0]]}</td>
                                            <td className="p-2 border border-gray-300 text-green-600 font-bold">{q[headers[1]]}</td>
                                            <td className="p-2 border border-gray-300">{headers.slice(2).map(h => q[h]).filter(Boolean).join(', ')}</td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                ) : (
                    <p className="text-center text-gray-500">No questions to preview.</p>
                )}
            </div>
        </div>
    );
};

const GoogleFormManager = () => {
    const [url, setUrl] = useState(localStorage.getItem('googleFormQuizUrl') || '');
    const [isVisible, setIsVisible] = useState(localStorage.getItem('googleFormQuizVisible') === 'true');
    const [message, setMessage] = useState('');

    const handleSave = () => {
        localStorage.setItem('googleFormQuizUrl', url);
        setMessage('Google Form link saved!');
        setTimeout(() => setMessage(''), 3000);
    };

    const handleToggleVisibility = () => {
        const newValue = !isVisible;
        setIsVisible(newValue);
        localStorage.setItem('googleFormQuizVisible', newValue);
    };

    return (
        <div className="bg-white rounded-2xl shadow-lg p-6">
            <div className="flex justify-between items-center mb-6">
                <h2 className="text-2xl font-bold">Google Form Quiz</h2>
                <div className="flex items-center">
                    <span className="mr-3 font-medium text-sm">Enable</span>
                    <button onClick={handleToggleVisibility} className={`px-4 py-2 w-16 text-sm rounded-lg text-white font-semibold transition-colors ${isVisible ? 'bg-green-600' : 'bg-gray-500'}`}>
                        {isVisible ? 'ON' : 'OFF'}
                    </button>
                </div>
            </div>
            {message && <p className="mb-4 text-green-600">{message}</p>}
            <div className="space-y-4">
                <div>
                    <label className="block text-sm font-medium">Google Form URL</label>
                    <input type="url" value={url} onChange={e => setUrl(e.target.value)} placeholder="Enter public Google Form link" className="mt-1 block w-full p-3 bg-gray-50 border border-gray-300 rounded-lg" />
                </div>
                <button onClick={handleSave} className="w-full py-3 px-4 bg-blue-600 text-white rounded-lg hover:bg-blue-700">Save Link</button>
            </div>
        </div>
    );
};

const ResultsManager = () => {
    const [results, setResults] = useState([]);
    const [leaderboardVisible, setLeaderboardVisible] = useState(localStorage.getItem('leaderboardVisible') === 'true');
    const [showClearConfirm, setShowClearConfirm] = useState(false);

    useEffect(() => {
        const storedResults = JSON.parse(localStorage.getItem('quizResults') || '[]');
        const sorted = storedResults.sort((a,b) => b.score - a.score);
        setResults(sorted);
    }, []);

    const handleToggleLeaderboard = () => {
        const newValue = !leaderboardVisible;
        setLeaderboardVisible(newValue);
        localStorage.setItem('leaderboardVisible', newValue);
    };
    
    const confirmClearResults = () => {
        localStorage.removeItem('quizResults');
        setResults([]);
        setShowClearConfirm(false);
    };

    return (
        <>
            {showClearConfirm && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
                    <div className="bg-white rounded-lg p-6 shadow-lg max-w-sm w-full">
                        <h3 className="text-lg font-bold mb-4">Confirm Action</h3>
                        <p>Are you sure you want to clear all quiz results? This cannot be undone.</p>
                        <div className="flex justify-end space-x-4 mt-6">
                            <button onClick={() => setShowClearConfirm(false)} className="px-4 py-2 bg-gray-200 rounded-lg hover:bg-gray-300">Cancel</button>
                            <button onClick={confirmClearResults} className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700">Clear Results</button>
                        </div>
                    </div>
                </div>
            )}
            <div className="bg-white rounded-2xl shadow-lg p-6">
                <div className="flex flex-col sm:flex-row justify-between sm:items-center mb-6 gap-4">
                    <h2 className="text-2xl font-bold">Results & Leaderboard</h2>
                    <div className="flex items-center">
                        <span className="mr-3 font-medium text-sm">Show Leaderboard</span>
                        <button 
                            onClick={handleToggleLeaderboard}
                            className={`px-4 py-2 w-16 text-sm rounded-lg text-white font-semibold transition-colors ${leaderboardVisible ? 'bg-green-600' : 'bg-gray-500'}`}
                        >
                            {leaderboardVisible ? 'ON' : 'OFF'}
                        </button>
                    </div>
                </div>
                
                <div className="mb-6">
                    <button onClick={() => setShowClearConfirm(true)} className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700">
                        Clear All Results
                    </button>
                </div>

                {results.length > 0 ? (
                    <div className="overflow-x-auto">
                        <table className="w-full text-left">
                            <thead className="bg-gray-50">
                                <tr>
                                    <th className="p-3 text-sm">Rank</th>
                                    <th className="p-3 text-sm">Name</th>
                                    <th className="p-3 text-sm">Points</th>
                                </tr>
                            </thead>
                            <tbody>
                                {results.map((r, i) => (
                                    <tr key={i} className="border-b">
                                        <td className="p-3 font-bold text-sm">{i + 1}</td>
                                        <td className="p-3 text-sm">{r.name}</td>
                                        <td className="p-3 font-bold text-sm">{r.score}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                ) : (
                    <p className="text-center text-gray-500">No results have been submitted yet.</p>
                )}
            </div>
        </>
    );
};
