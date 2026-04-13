import AsyncStorage from "@react-native-async-storage/async-storage";
import { useEffect, useMemo, useState } from "react";
import {
  Alert,
  Animated,
  Pressable,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";

type ScreenState =
  | "checkin"
  | "result"
  | "break"
  | "reflection"
  | "complete"
  | "followThrough"
  | "history";

type ReflectionChoice = "controllable" | "uncontrollable" | null;
type HistoryFilter = "all" | "completed" | "skipped";

type CheckIn = {
  id: string;
  timestamp: string;
  stressLevel: number;
  notes?: string;
  supportiveMessage?: string;
  breakTitle?: string;
  breakSubtitle?: string;
  breakDuration?: string;
  breakAction?: string;
  breakCompleted?: boolean;
  followThroughCompleted?: boolean;
};

type StressStat = {
  label: string;
  count: number;
};

type BreakRecommendation = {
  title: string;
  subtitle: string;
  duration: string;
  action: string;
  minutes: number;
};

type TrendPoint = {
  id: string;
  label: string;
  value: number;
};

type ReflectionBoost = {
  title: string;
  message: string;
  action: string;
  reset: string;
};

export default function HomeScreen() {
  const [selectedStress, setSelectedStress] = useState<number | null>(null);
  const [screen, setScreen] = useState<ScreenState>("checkin");
  const [stressSeverity, setStressSeverity] = useState("");
  const [stressMessage, setStressMessage] = useState("");
  const [notes, setNotes] = useState("");
  const [reflectionChoice, setReflectionChoice] =
    useState<ReflectionChoice>(null);
  const [followUpMessage, setFollowUpMessage] = useState("");
  const [reflectionBoost, setReflectionBoost] = useState<ReflectionBoost>({
    title: "",
    message: "",
    action: "",
    reset: "",
  });
  const [currentCheckInId, setCurrentCheckInId] = useState<string | null>(null);
  const [savedCheckIns, setSavedCheckIns] = useState<CheckIn[]>([]);
  const [stressStats, setStressStats] = useState<StressStat[]>([]);
  const [historyFilter, setHistoryFilter] = useState<HistoryFilter>("all");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showSuccessBanner, setShowSuccessBanner] = useState(false);
  const [bannerOpacity] = useState(new Animated.Value(0));
  const [breakRecommendation, setBreakRecommendation] =
    useState<BreakRecommendation>({
      title: "",
      subtitle: "",
      duration: "",
      action: "",
      minutes: 0,
    });
  const [supportiveMessage, setSupportiveMessage] = useState("");
  const [breakSecondsRemaining, setBreakSecondsRemaining] = useState(0);
  const [isBreakRunning, setIsBreakRunning] = useState(false);
  const [breakFinished, setBreakFinished] = useState(false);

  const stressOptions = [
    { level: 1, emoji: "😊", label: "Calm" },
    { level: 2, emoji: "🙂", label: "Okay" },
    { level: 3, emoji: "😐", label: "Mild" },
    { level: 4, emoji: "😟", label: "Stressed" },
    { level: 5, emoji: "😰", label: "Very Stressed" },
  ];

  const lowStressMessages = [
    "You're doing great. Keep it up!",
    "Nice. You're in a good space right now.",
    "Stay steady. You're handling things well.",
  ];

  const moderateStressMessages = [
    "A quick reset could help before stress builds further.",
    "You're feeling it a bit. Let's take a small step back.",
    "Pause for a second. You can regain control here.",
  ];

  const highStressMessages = [
    "Let's take a break and reset before moving forward.",
    "You're carrying a lot. Step away for a moment.",
    "Reset now. You'll come back stronger.",
  ];

  const rotatingSupportiveMessages = [
    "You are doing better than you think.",
    "Pause for a second. You do not have to carry everything at once.",
    "One step at a time still counts as progress.",
    "Resetting is not falling behind.",
    "You can slow down without losing momentum.",
    "Take a breath. Then take the next right step.",
    "A small break can change the rest of your day.",
    "You have handled hard days before. You can handle this one too.",
  ];

  const dailyEncouragementMessages = [
    "Start small today. Small wins still count.",
    "You do not need a perfect day to make progress.",
    "Protect your energy and move with intention.",
    "One calm decision can shift your whole day.",
    "Take a breath and handle what is in front of you.",
    "You are allowed to reset and still move forward.",
    "Keep going. Steady effort builds real momentum.",
  ];

  const getRandomItem = (arr: string[]) =>
    arr[Math.floor(Math.random() * arr.length)];

  const getRotatingSupportiveMessage = (existingCheckIns: CheckIn[]) => {
    const index = existingCheckIns.length % rotatingSupportiveMessages.length;
    return rotatingSupportiveMessages[index];
  };

  const getStressLabel = (level: number) => {
    switch (level) {
      case 1:
        return "Calm";
      case 2:
        return "Okay";
      case 3:
        return "Mild";
      case 4:
        return "Stressed";
      case 5:
        return "Very Stressed";
      default:
        return "Unknown";
    }
  };

  const getStressEmoji = (level: number) => {
    switch (level) {
      case 1:
        return "😊";
      case 2:
        return "🙂";
      case 3:
        return "😐";
      case 4:
        return "😟";
      case 5:
        return "😰";
      default:
        return "❓";
    }
  };

  const getStoredCheckIns = async (): Promise<CheckIn[]> => {
    try {
      const existingCheckIns = await AsyncStorage.getItem("checkins");
      return existingCheckIns ? JSON.parse(existingCheckIns) : [];
    } catch (error) {
      console.log("Error loading stored check-ins:", error);
      return [];
    }
  };

  const getSmarterBreakRecommendation = (
    level: number,
    existingCheckIns: CheckIn[]
  ): BreakRecommendation => {
    const currentHour = new Date().getHours();
    const recentCheckIns = [...existingCheckIns]
      .sort(
        (a, b) =>
          new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
      )
      .slice(0, 3);

    const recentAverage =
      recentCheckIns.length > 0
        ? recentCheckIns.reduce((sum, item) => sum + item.stressLevel, 0) /
          recentCheckIns.length
        : 0;

    const repeatedHighStress =
      recentCheckIns.length >= 2 &&
      recentCheckIns.every((item) => item.stressLevel >= 4);

    if (level === 3) {
      if (currentHour >= 14) {
        return {
          title: "Quick Reset",
          subtitle: "Your stress is building as the day moves on.",
          duration: "Recommended break: 5 minutes",
          action:
            "Stand up, get water, take 5 slow breaths, and return to only one task.",
          minutes: 5,
        };
      }

      return {
        title: "Quick Reset",
        subtitle: "A small pause now can keep stress from climbing.",
        duration: "Recommended break: 3 to 5 minutes",
        action:
          "Stretch, loosen your shoulders, and look away from your screen for a minute.",
        minutes: 4,
      };
    }

    if (level === 4) {
      if (repeatedHighStress || recentAverage >= 4) {
        return {
          title: "Reset Break",
          subtitle: "Your recent check-ins show stress staying high.",
          duration: "Recommended break: 10 minutes",
          action:
            "Leave your workspace, walk around, hydrate, and come back to the single most important task.",
          minutes: 10,
        };
      }

      return {
        title: "Reset Break",
        subtitle: "Stress is elevated. A stronger reset would help.",
        duration: "Recommended break: 8 to 10 minutes",
        action:
          "Step away from your environment, breathe slowly, and avoid jumping right back into everything at once.",
        minutes: 8,
      };
    }

    if (level === 5) {
      if (repeatedHighStress || recentAverage >= 4.3) {
        return {
          title: "Full Reset",
          subtitle: "Your stress has stayed high across multiple check-ins.",
          duration: "Recommended break: 15 to 20 minutes",
          action:
            "Fully disconnect for a bit, leave your workspace, hydrate, and let your body settle before returning.",
          minutes: 15,
        };
      }

      return {
        title: "Full Reset",
        subtitle: "You are carrying a lot right now.",
        duration: "Recommended break: 15 minutes",
        action:
          "Put everything down for a few minutes, take slow breaths, and give yourself space before trying again.",
        minutes: 15,
      };
    }

    return {
      title: "",
      subtitle: "",
      duration: "",
      action: "",
      minutes: 0,
    };
  };

  const evaluateStress = (level: number) => {
    if (level <= 2) {
      return {
        severity: "Low",
        message: getRandomItem(lowStressMessages),
        nextScreen: "result" as ScreenState,
      };
    }

    if (level === 3) {
      return {
        severity: "Moderate",
        message: getRandomItem(moderateStressMessages),
        nextScreen: "break" as ScreenState,
      };
    }

    return {
      severity: "High",
      message: getRandomItem(highStressMessages),
      nextScreen: "break" as ScreenState,
    };
  };

  const getReflectionBoost = (
    choice: "controllable" | "uncontrollable"
  ): ReflectionBoost => {
    if (choice === "controllable") {
      return {
        title: "Take Your Next Step",
        message:
          "That is good news. If it is in your hands, then you already have a path forward. Progress does not need to be perfect. It just needs to begin.",
        action:
          "Pick one small action you can complete in the next 10 minutes and do only that.",
        reset:
          "You do not need to solve everything right now. Just move one thing forward.",
      };
    }

    return {
      title: "Release What Is Not Yours",
      message:
        "Not everything deserves your energy. Letting go is not weakness. It is discipline. Protect your peace and return to what is actually yours to carry.",
      action:
        "Take one deep breath, unclench your shoulders, and shift your focus to one thing that is fully within your control.",
      reset:
        "You are allowed to leave what is not yours behind and keep moving.",
    };
  };

  const buildStressStats = (checkIns: CheckIn[]): StressStat[] => {
    return [
      {
        label: "Calm",
        count: checkIns.filter((item) => item.stressLevel === 1).length,
      },
      {
        label: "Okay",
        count: checkIns.filter((item) => item.stressLevel === 2).length,
      },
      {
        label: "Mild",
        count: checkIns.filter((item) => item.stressLevel === 3).length,
      },
      {
        label: "Stressed",
        count: checkIns.filter((item) => item.stressLevel === 4).length,
      },
      {
        label: "Very Stressed",
        count: checkIns.filter((item) => item.stressLevel === 5).length,
      },
    ];
  };

  const saveCheckIn = async (
    stressLevel: number,
    noteText: string,
    message: string,
    recommendation: BreakRecommendation
  ) => {
    try {
      const existingCheckIns = await AsyncStorage.getItem("checkins");
      const parsedCheckIns: CheckIn[] = existingCheckIns
        ? JSON.parse(existingCheckIns)
        : [];

      const newCheckIn: CheckIn = {
        id: Date.now().toString(),
        timestamp: new Date().toISOString(),
        stressLevel,
        notes: noteText.trim(),
        supportiveMessage: message,
        breakTitle: recommendation.title,
        breakSubtitle: recommendation.subtitle,
        breakDuration: recommendation.duration,
        breakAction: recommendation.action,
        breakCompleted: undefined,
        followThroughCompleted: undefined,
      };

      const updatedCheckIns = [...parsedCheckIns, newCheckIn];

      await AsyncStorage.setItem("checkins", JSON.stringify(updatedCheckIns));

      return newCheckIn.id;
    } catch (error) {
      console.log("Error saving check-in:", error);
      return null;
    }
  };

  const updateBreakCompletionStatus = async (
    id: string,
    completed: boolean
  ) => {
    try {
      const existingCheckIns = await AsyncStorage.getItem("checkins");
      const parsedCheckIns: CheckIn[] = existingCheckIns
        ? JSON.parse(existingCheckIns)
        : [];

      const updatedCheckIns = parsedCheckIns.map((checkIn) =>
        checkIn.id === id
          ? {
              ...checkIn,
              breakCompleted: completed,
            }
          : checkIn
      );

      await AsyncStorage.setItem("checkins", JSON.stringify(updatedCheckIns));

      const sortedCheckIns = [...updatedCheckIns].sort(
        (a, b) =>
          new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
      );

      setSavedCheckIns(sortedCheckIns);
      setStressStats(buildStressStats(updatedCheckIns));
    } catch (error) {
      console.log("Error updating break completion status:", error);
    }
  };

  const updateFollowThroughStatus = async (
    id: string,
    completed: boolean
  ) => {
    try {
      const existingCheckIns = await AsyncStorage.getItem("checkins");
      const parsedCheckIns: CheckIn[] = existingCheckIns
        ? JSON.parse(existingCheckIns)
        : [];

      const updatedCheckIns = parsedCheckIns.map((checkIn) =>
        checkIn.id === id
          ? {
              ...checkIn,
              followThroughCompleted: completed,
            }
          : checkIn
      );

      await AsyncStorage.setItem("checkins", JSON.stringify(updatedCheckIns));

      const sortedCheckIns = [...updatedCheckIns].sort(
        (a, b) =>
          new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
      );

      setSavedCheckIns(sortedCheckIns);
      setStressStats(buildStressStats(updatedCheckIns));
    } catch (error) {
      console.log("Error updating follow-through status:", error);
    }
  };

  const getCheckIns = async () => {
    try {
      const existingCheckIns = await AsyncStorage.getItem("checkins");
      const parsedCheckIns: CheckIn[] = existingCheckIns
        ? JSON.parse(existingCheckIns)
        : [];

      const sortedCheckIns = [...parsedCheckIns].sort(
        (a, b) =>
          new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
      );

      setSavedCheckIns(sortedCheckIns);
      setStressStats(buildStressStats(parsedCheckIns));
    } catch (error) {
      console.log("Error loading check-ins:", error);
    }
  };

  const saveReflection = async (
    checkInId: string,
    userResponse: "controllable" | "uncontrollable"
  ) => {
    try {
      const existingReflections = await AsyncStorage.getItem("reflections");
      const parsedReflections = existingReflections
        ? JSON.parse(existingReflections)
        : [];

      const newReflection = {
        id: Date.now().toString(),
        checkInId,
        timestamp: new Date().toISOString(),
        promptShown: "Was this stressor something within your control?",
        userResponse,
      };

      const updatedReflections = [...parsedReflections, newReflection];

      await AsyncStorage.setItem(
        "reflections",
        JSON.stringify(updatedReflections)
      );
    } catch (error) {
      console.log("Error saving reflection:", error);
    }
  };

  const clearAllData = async () => {
    try {
      await AsyncStorage.removeItem("checkins");
      await AsyncStorage.removeItem("reflections");
      setSavedCheckIns([]);
      setStressStats([]);
      Alert.alert("Done", "All saved data has been cleared.");
    } catch (error) {
      console.log("Error clearing data:", error);
    }
  };

  const deleteCheckIn = async (id: string) => {
    try {
      const existingCheckIns = await AsyncStorage.getItem("checkins");
      const parsedCheckIns: CheckIn[] = existingCheckIns
        ? JSON.parse(existingCheckIns)
        : [];

      const updatedCheckIns = parsedCheckIns.filter(
        (checkIn) => checkIn.id !== id
      );

      await AsyncStorage.setItem("checkins", JSON.stringify(updatedCheckIns));

      const sortedCheckIns = [...updatedCheckIns].sort(
        (a, b) =>
          new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
      );

      setSavedCheckIns(sortedCheckIns);
      setStressStats(buildStressStats(updatedCheckIns));
    } catch (error) {
      console.log("Error deleting check-in:", error);
      Alert.alert("Error", "Could not delete this check-in.");
    }
  };

  const confirmDeleteCheckIn = (id: string) => {
    Alert.alert(
      "Delete Check-In",
      "Are you sure you want to delete this saved check-in?",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: () => deleteCheckIn(id),
        },
      ]
    );
  };

  const handleSubmit = async () => {
    if (selectedStress === null) {
      Alert.alert("Missing Selection", "Please choose how you're feeling first.");
      return;
    }

    if (isSubmitting) return;

    try {
      setIsSubmitting(true);

      const existingCheckIns = await getStoredCheckIns();
      const nextSupportiveMessage = getRotatingSupportiveMessage(existingCheckIns);
      const smarterRecommendation = getSmarterBreakRecommendation(
        selectedStress,
        existingCheckIns
      );

      const savedCheckInId = await saveCheckIn(
        selectedStress,
        notes,
        nextSupportiveMessage,
        smarterRecommendation
      );

      if (!savedCheckInId) {
        Alert.alert("Error", "Your check-in could not be saved.");
        return;
      }

      setCurrentCheckInId(savedCheckInId);

      const result = evaluateStress(selectedStress);
      setStressSeverity(result.severity);
      setStressMessage(result.message);
      setSupportiveMessage(nextSupportiveMessage);
      setBreakRecommendation(smarterRecommendation);
      setBreakSecondsRemaining(smarterRecommendation.minutes * 60);
      setIsBreakRunning(true);
      setBreakFinished(false);

      setNotes("");
      setSelectedStress(null);
      setShowSuccessBanner(true);

      Animated.sequence([
        Animated.timing(bannerOpacity, {
          toValue: 1,
          duration: 250,
          useNativeDriver: true,
        }),
        Animated.delay(900),
        Animated.timing(bannerOpacity, {
          toValue: 0,
          duration: 250,
          useNativeDriver: true,
        }),
      ]).start(() => {
        setShowSuccessBanner(false);
        setScreen(result.nextScreen);
      });
    } catch (error) {
      console.log("Error submitting check-in:", error);
      Alert.alert("Error", "Something went wrong while saving your check-in.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleReflectionChoice = async (
    choice: "controllable" | "uncontrollable"
  ) => {
    setReflectionChoice(choice);

    if (choice === "controllable") {
      setFollowUpMessage("Good. Now move it forward. One step. Right now.");
    } else {
      setFollowUpMessage("Let it go. Protect your energy and keep moving.");
    }

    setReflectionBoost(getReflectionBoost(choice));

    if (currentCheckInId) {
      await saveReflection(currentCheckInId, choice);
    }

    setScreen("complete");
  };

  const handleFollowThroughChoice = async (completed: boolean) => {
    if (currentCheckInId) {
      await updateFollowThroughStatus(currentCheckInId, completed);
    }

    setScreen("followThrough");
  };

  const openHistory = async () => {
    await getCheckIns();
    setHistoryFilter("all");
    setScreen("history");
  };

  const resetToHome = async () => {
    setSelectedStress(null);
    setStressSeverity("");
    setStressMessage("");
    setSupportiveMessage("");
    setNotes("");
    setReflectionChoice(null);
    setFollowUpMessage("");
    setReflectionBoost({
      title: "",
      message: "",
      action: "",
      reset: "",
    });
    setCurrentCheckInId(null);
    setIsSubmitting(false);
    setShowSuccessBanner(false);
    bannerOpacity.setValue(0);
    setBreakRecommendation({
      title: "",
      subtitle: "",
      duration: "",
      action: "",
      minutes: 0,
    });
    setBreakSecondsRemaining(0);
    setIsBreakRunning(false);
    setBreakFinished(false);
    setHistoryFilter("all");
    await getCheckIns();
    setScreen("checkin");
  };

  const formatTimer = (seconds: number) => {
    const safeSeconds = Math.max(0, seconds);
    const minutes = Math.floor(safeSeconds / 60);
    const remainingSeconds = safeSeconds % 60;

    return `${minutes}:${remainingSeconds.toString().padStart(2, "0")}`;
  };

  const adjustBreakTime = (secondsToAdd: number) => {
    setBreakSecondsRemaining((prev) => {
      const updated = prev + secondsToAdd;
      return updated < 0 ? 0 : updated;
    });

    if (breakFinished && secondsToAdd > 0) {
      setBreakFinished(false);
    }
  };

  const resetBreakTimer = () => {
    const resetSeconds = breakRecommendation.minutes * 60;
    setBreakSecondsRemaining(resetSeconds);
    setBreakFinished(false);
    setIsBreakRunning(true);
  };

  const startOrPauseBreak = () => {
    if (breakFinished) return;
    setIsBreakRunning((prev) => !prev);
  };

  const skipBreak = async () => {
    setIsBreakRunning(false);

    if (currentCheckInId) {
      await updateBreakCompletionStatus(currentCheckInId, false);
    }

    setScreen("reflection");
  };

  const continueAfterCompletedBreak = async () => {
    if (currentCheckInId) {
      await updateBreakCompletionStatus(currentCheckInId, true);
    }

    setScreen("reflection");
  };

  useEffect(() => {
    getCheckIns();
  }, []);

  useEffect(() => {
    if (screen === "history" || screen === "checkin") {
      getCheckIns();
    }
  }, [screen]);

  useEffect(() => {
    if (screen !== "break" || !isBreakRunning || breakSecondsRemaining <= 0) {
      return;
    }

    const interval = setInterval(() => {
      setBreakSecondsRemaining((prev) => {
        if (prev <= 1) {
          clearInterval(interval);
          setIsBreakRunning(false);
          setBreakFinished(true);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [screen, isBreakRunning, breakSecondsRemaining]);

  const trendData: TrendPoint[] = useMemo(() => {
    const lastSeven = [...savedCheckIns].slice(0, 7).reverse();

    return lastSeven.map((item, index) => ({
      id: item.id,
      label: `${index + 1}`,
      value: item.stressLevel,
    }));
  }, [savedCheckIns]);

  const filteredCheckIns = useMemo(() => {
    if (historyFilter === "completed") {
      return savedCheckIns.filter((item) => item.breakCompleted === true);
    }

    if (historyFilter === "skipped") {
      return savedCheckIns.filter((item) => item.breakCompleted === false);
    }

    return savedCheckIns;
  }, [savedCheckIns, historyFilter]);

  const allCount = useMemo(() => savedCheckIns.length, [savedCheckIns]);

  const completedCount = useMemo(
    () => savedCheckIns.filter((item) => item.breakCompleted === true).length,
    [savedCheckIns]
  );

  const skippedCount = useMemo(
    () => savedCheckIns.filter((item) => item.breakCompleted === false).length,
    [savedCheckIns]
  );

  const dailyStreak = useMemo(() => {
    if (savedCheckIns.length === 0) return 0;

    const uniqueDays = Array.from(
      new Set(
        savedCheckIns.map((item) => {
          const date = new Date(item.timestamp);
          return `${date.getFullYear()}-${date.getMonth()}-${date.getDate()}`;
        })
      )
    ).sort(
      (a, b) =>
        new Date(b.replace(/-/g, "/")).getTime() -
        new Date(a.replace(/-/g, "/")).getTime()
    );

    if (uniqueDays.length === 0) return 0;

    let streak = 0;
    const today = new Date();
    let compareDate = new Date(
      today.getFullYear(),
      today.getMonth(),
      today.getDate()
    );

    const mostRecentDate = new Date(savedCheckIns[0].timestamp);
    const mostRecentDay = new Date(
      mostRecentDate.getFullYear(),
      mostRecentDate.getMonth(),
      mostRecentDate.getDate()
    );

    const diffInDays = Math.floor(
      (compareDate.getTime() - mostRecentDay.getTime()) / (1000 * 60 * 60 * 24)
    );

    if (diffInDays > 1) {
      return 0;
    }

    if (diffInDays === 1) {
      compareDate = new Date(
        today.getFullYear(),
        today.getMonth(),
        today.getDate() - 1
      );
    }

    for (let i = 0; i < uniqueDays.length; i++) {
      const dayKey = `${compareDate.getFullYear()}-${compareDate.getMonth()}-${compareDate.getDate()}`;

      if (uniqueDays.includes(dayKey)) {
        streak += 1;
        compareDate = new Date(
          compareDate.getFullYear(),
          compareDate.getMonth(),
          compareDate.getDate() - 1
        );
      } else {
        break;
      }
    }

    return streak;
  }, [savedCheckIns]);

  const dailyEncouragement = useMemo(() => {
    const today = new Date();
    const startOfYear = new Date(today.getFullYear(), 0, 0);
    const diff = today.getTime() - startOfYear.getTime();
    const dayOfYear = Math.floor(diff / (1000 * 60 * 60 * 24));
    const index = dayOfYear % dailyEncouragementMessages.length;
    return dailyEncouragementMessages[index];
  }, []);

  const insightText = useMemo(() => {
    if (savedCheckIns.length === 0) {
      return "No insights yet. Save a few check-ins to start spotting patterns.";
    }

    const recentThree = savedCheckIns.slice(0, 3);
    const previousThree = savedCheckIns.slice(3, 6);

    const recentAverage =
      recentThree.reduce((sum, item) => sum + item.stressLevel, 0) /
      recentThree.length;

    if (savedCheckIns.length < 3) {
      return `Your recent average stress is ${recentAverage.toFixed(1)}. Keep checking in to build a clearer pattern.`;
    }

    if (previousThree.length > 0) {
      const previousAverage =
        previousThree.reduce((sum, item) => sum + item.stressLevel, 0) /
        previousThree.length;

      if (recentAverage < previousAverage) {
        return `Your last 3 check-ins averaged ${recentAverage.toFixed(1)}. Stress has been trending down.`;
      }

      if (recentAverage > previousAverage) {
        return `Your last 3 check-ins averaged ${recentAverage.toFixed(1)}. Stress has been trending up.`;
      }
    }

    if (recentAverage >= 4) {
      return `Your last 3 check-ins averaged ${recentAverage.toFixed(1)}. You may need more consistent recovery breaks.`;
    }

    if (recentAverage <= 2) {
      return `Your last 3 check-ins averaged ${recentAverage.toFixed(1)}. You have been in a pretty steady zone lately.`;
    }

    return `Your last 3 check-ins averaged ${recentAverage.toFixed(1)}. You are in a middle range right now.`;
  }, [savedCheckIns]);

  const weeklyMetrics = useMemo(() => {
    const now = new Date();
    const sevenDaysAgo = new Date(
      now.getFullYear(),
      now.getMonth(),
      now.getDate() - 6
    );

    const weeklyCheckIns = savedCheckIns.filter((item) => {
      const itemDate = new Date(item.timestamp);
      return itemDate >= sevenDaysAgo;
    });

    const uniqueDays = new Set(
      weeklyCheckIns.map((item) => {
        const d = new Date(item.timestamp);
        return `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;
      })
    );

    const breakRelevant = weeklyCheckIns.filter(
      (item) => item.breakCompleted !== undefined
    );
    const breakCompleted = breakRelevant.filter(
      (item) => item.breakCompleted === true
    );

    const followThroughRelevant = weeklyCheckIns.filter(
      (item) => item.followThroughCompleted !== undefined
    );
    const followThroughDone = followThroughRelevant.filter(
      (item) => item.followThroughCompleted === true
    );

    const checkInDaysScore = Math.round((uniqueDays.size / 7) * 40);
    const breakScore =
      breakRelevant.length > 0
        ? Math.round((breakCompleted.length / breakRelevant.length) * 30)
        : 0;
    const followThroughScore =
      followThroughRelevant.length > 0
        ? Math.round(
            (followThroughDone.length / followThroughRelevant.length) * 30
          )
        : 0;

    const totalScore = checkInDaysScore + breakScore + followThroughScore;

    let label = "Building";
    if (totalScore >= 80) {
      label = "Locked In";
    } else if (totalScore >= 60) {
      label = "Strong";
    } else if (totalScore >= 40) {
      label = "Steady";
    }

    return {
      score: totalScore,
      label,
      checkInDays: uniqueDays.size,
      breakCompleted: breakCompleted.length,
      breakRelevant: breakRelevant.length,
      followThroughDone: followThroughDone.length,
      followThroughRelevant: followThroughRelevant.length,
    };
  }, [savedCheckIns]);

  if (screen === "history") {
    return (
      <SafeAreaView style={styles.container}>
        <Text style={styles.title}>Saved Check-Ins</Text>

        <ScrollView
          style={styles.historyContainer}
          contentContainerStyle={styles.historyScrollContent}
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.scoreCard}>
            <Text style={styles.scoreTitle}>Weekly Wellness Score</Text>
            <Text style={styles.scoreValue}>{weeklyMetrics.score}</Text>
            <Text style={styles.scoreLabel}>{weeklyMetrics.label}</Text>

            <View style={styles.scoreStatsRow}>
              <View style={styles.scoreStatBox}>
                <Text style={styles.scoreStatLabel}>Check-In Days</Text>
                <Text style={styles.scoreStatValue}>
                  {weeklyMetrics.checkInDays}/7
                </Text>
              </View>

              <View style={styles.scoreStatBox}>
                <Text style={styles.scoreStatLabel}>Breaks Completed</Text>
                <Text style={styles.scoreStatValue}>
                  {weeklyMetrics.breakCompleted}/{weeklyMetrics.breakRelevant}
                </Text>
              </View>

              <View style={styles.scoreStatBox}>
                <Text style={styles.scoreStatLabel}>Follow Through</Text>
                <Text style={styles.scoreStatValue}>
                  {weeklyMetrics.followThroughDone}/
                  {weeklyMetrics.followThroughRelevant}
                </Text>
              </View>
            </View>
          </View>

          <View style={styles.chartCard}>
            <Text style={styles.chartTitle}>Stress Trend</Text>

            <View style={styles.insightRow}>
              <View style={styles.insightBox}>
                <Text style={styles.insightLabel}>Current Streak</Text>
                <Text style={styles.insightValue}>
                  {dailyStreak} day{dailyStreak === 1 ? "" : "s"}
                </Text>
              </View>

              <View style={styles.insightBox}>
                <Text style={styles.insightLabel}>Recent Insight</Text>
                <Text style={styles.insightText}>{insightText}</Text>
              </View>
            </View>

            {trendData.length === 0 ? (
              <Text style={styles.chartEmptyText}>No stress data yet.</Text>
            ) : (
              <>
                <Text style={styles.chartSubtext}>
                  Last {trendData.length} check-in
                  {trendData.length === 1 ? "" : "s"}
                </Text>

                <View style={styles.trendChartBox}>
                  {trendData.map((item) => (
                    <View key={item.id} style={styles.trendBarGroup}>
                      <Text style={styles.trendValue}>{item.value}</Text>

                      <View style={styles.trendBarTrack}>
                        <View
                          style={[
                            styles.trendBarFill,
                            { height: item.value * 22 },
                          ]}
                        />
                      </View>

                      <Text style={styles.trendBarLabel}>{item.label}</Text>
                    </View>
                  ))}
                </View>
              </>
            )}
          </View>

          <View style={styles.summaryCountRow}>
            <View style={styles.summaryCountCard}>
              <Text style={styles.summaryCountLabel}>All</Text>
              <Text style={styles.summaryCountValue}>{allCount}</Text>
            </View>

            <View style={styles.summaryCountCard}>
              <Text style={styles.summaryCountLabel}>Completed</Text>
              <Text style={styles.summaryCountValue}>{completedCount}</Text>
            </View>

            <View style={styles.summaryCountCard}>
              <Text style={styles.summaryCountLabel}>Skipped</Text>
              <Text style={styles.summaryCountValue}>{skippedCount}</Text>
            </View>
          </View>

          <View style={styles.filterRow}>
            <TouchableOpacity
              style={[
                styles.filterButton,
                historyFilter === "all" && styles.activeFilterButton,
              ]}
              onPress={() => setHistoryFilter("all")}
            >
              <Text
                style={[
                  styles.filterButtonText,
                  historyFilter === "all" && styles.activeFilterButtonText,
                ]}
              >
                All
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.filterButton,
                historyFilter === "completed" && styles.activeFilterButton,
              ]}
              onPress={() => setHistoryFilter("completed")}
            >
              <Text
                style={[
                  styles.filterButtonText,
                  historyFilter === "completed" &&
                    styles.activeFilterButtonText,
                ]}
              >
                Completed
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.filterButton,
                historyFilter === "skipped" && styles.activeFilterButton,
              ]}
              onPress={() => setHistoryFilter("skipped")}
            >
              <Text
                style={[
                  styles.filterButtonText,
                  historyFilter === "skipped" && styles.activeFilterButtonText,
                ]}
              >
                Skipped
              </Text>
            </TouchableOpacity>
          </View>

          {filteredCheckIns.length === 0 ? (
            <Text style={styles.resultMessage}>No check-ins match this filter.</Text>
          ) : (
            filteredCheckIns.map((checkIn) => (
              <View key={checkIn.id} style={styles.historyCard}>
                <View style={styles.historyMainContent}>
                  <Text style={styles.historyEmoji}>
                    {getStressEmoji(checkIn.stressLevel)}
                  </Text>

                  <View style={styles.historyTextBlock}>
                    <Text style={styles.historyLabel}>
                      {getStressLabel(checkIn.stressLevel)}
                    </Text>

                    <View style={styles.badgeRow}>
                      {checkIn.breakCompleted === true ? (
                        <View style={styles.completedBadge}>
                          <Text style={styles.badgeText}>Completed Break</Text>
                        </View>
                      ) : null}

                      {checkIn.breakCompleted === false ? (
                        <View style={styles.skippedBadge}>
                          <Text style={styles.badgeText}>Skipped Break</Text>
                        </View>
                      ) : null}

                      {checkIn.followThroughCompleted === true ? (
                        <View style={styles.followThroughBadge}>
                          <Text style={styles.badgeText}>Followed Through</Text>
                        </View>
                      ) : null}

                      {checkIn.followThroughCompleted === false ? (
                        <View style={styles.notYetBadge}>
                          <Text style={styles.badgeText}>Not Yet</Text>
                        </View>
                      ) : null}
                    </View>

                    {checkIn.notes ? (
                      <Text style={styles.historyNotes}>{checkIn.notes}</Text>
                    ) : null}

                    {checkIn.supportiveMessage ? (
                      <Text style={styles.historySupportiveMessage}>
                        {checkIn.supportiveMessage}
                      </Text>
                    ) : null}

                    {checkIn.breakAction ? (
                      <Text style={styles.historyBreakAction}>
                        {checkIn.breakAction}
                      </Text>
                    ) : null}

                    <Text style={styles.historyTimestamp}>
                      {new Date(checkIn.timestamp).toLocaleString()}
                    </Text>
                  </View>
                </View>

                <TouchableOpacity
                  style={styles.deleteButton}
                  onPress={() => confirmDeleteCheckIn(checkIn.id)}
                >
                  <Text style={styles.deleteButtonText}>Delete</Text>
                </TouchableOpacity>
              </View>
            ))
          )}
        </ScrollView>

        <TouchableOpacity style={styles.submitButton} onPress={resetToHome}>
          <Text style={styles.submitButtonText}>Back Home</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.submitButton, styles.clearButton]}
          onPress={clearAllData}
        >
          <Text style={styles.submitButtonText}>Clear Saved Data</Text>
        </TouchableOpacity>
      </SafeAreaView>
    );
  }

  if (screen === "result") {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.centerContent}>
          <Text style={styles.title}>Check-In Logged</Text>
          <Text style={styles.resultLabel}>Stress Level: {stressSeverity}</Text>
          <Text style={styles.resultMessage}>{stressMessage}</Text>

          {supportiveMessage ? (
            <View style={styles.supportiveCard}>
              <Text style={styles.supportiveCardTitle}>Supportive Message</Text>
              <Text style={styles.supportiveCardText}>{supportiveMessage}</Text>
            </View>
          ) : null}

          <TouchableOpacity style={styles.submitButton} onPress={resetToHome}>
            <Text style={styles.submitButtonText}>Back Home</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  if (screen === "break") {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.centerContent}>
          <Text style={styles.title}>{breakRecommendation.title}</Text>
          <Text style={styles.resultLabel}>{stressMessage}</Text>

          {supportiveMessage ? (
            <View style={styles.supportiveCard}>
              <Text style={styles.supportiveCardTitle}>Supportive Message</Text>
              <Text style={styles.supportiveCardText}>{supportiveMessage}</Text>
            </View>
          ) : null}

          <Text style={styles.resultMessage}>{breakRecommendation.subtitle}</Text>
          <Text style={styles.breakTime}>{breakRecommendation.duration}</Text>
          <Text style={styles.breakAction}>{breakRecommendation.action}</Text>

          <View style={styles.timerCard}>
            <Text style={styles.timerLabel}>Break Timer</Text>
            <Text style={styles.timerText}>
              {formatTimer(breakSecondsRemaining)}
            </Text>

            <View style={styles.timerAdjustRow}>
              <TouchableOpacity
                style={styles.timerAdjustButton}
                onPress={() => adjustBreakTime(-60)}
              >
                <Text style={styles.timerAdjustButtonText}>-1 min</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.timerAdjustButton}
                onPress={() => adjustBreakTime(60)}
              >
                <Text style={styles.timerAdjustButtonText}>+1 min</Text>
              </TouchableOpacity>
            </View>

            <TouchableOpacity
              style={styles.resetTimerButton}
              onPress={resetBreakTimer}
            >
              <Text style={styles.resetTimerButtonText}>Reset Timer</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.timerPrimaryButton}
              onPress={startOrPauseBreak}
            >
              <Text style={styles.timerPrimaryButtonText}>
                {breakFinished
                  ? "Break Complete"
                  : isBreakRunning
                  ? "Pause Timer"
                  : "Resume Timer"}
              </Text>
            </TouchableOpacity>

            {breakFinished ? (
              <TouchableOpacity
                style={styles.submitButton}
                onPress={continueAfterCompletedBreak}
              >
                <Text style={styles.submitButtonText}>Continue to Reflection</Text>
              </TouchableOpacity>
            ) : (
              <TouchableOpacity style={styles.skipButton} onPress={skipBreak}>
                <Text style={styles.skipButtonText}>Skip Break</Text>
              </TouchableOpacity>
            )}
          </View>
        </View>
      </SafeAreaView>
    );
  }

  if (screen === "reflection") {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.centerContent}>
          <Text style={styles.title}>Reflection</Text>
          <Text style={styles.resultMessage}>
            Was this stressor something within your control?
          </Text>

          <TouchableOpacity
            style={styles.reflectionButton}
            onPress={() => handleReflectionChoice("controllable")}
          >
            <Text style={styles.reflectionButtonText}>Yes, I can act</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.reflectionButton, styles.secondaryButton]}
            onPress={() => handleReflectionChoice("uncontrollable")}
          >
            <Text style={styles.reflectionButtonText}>No, let them</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  if (screen === "complete") {
    const momentumWidth =
      reflectionChoice === "controllable" ? "82%" : "64%";

    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.centerContent}>
          <Text style={styles.title}>Reflection Complete</Text>

          <View style={styles.momentumWrap}>
            <Text style={styles.momentumLabel}>Momentum</Text>
            <View style={styles.momentumTrack}>
              <View style={[styles.momentumFill, { width: momentumWidth }]} />
            </View>
          </View>

          <Text style={styles.resultLabel}>
            {reflectionChoice === "controllable"
              ? "Within your control"
              : "Outside your control"}
          </Text>

          <View style={styles.completeCard}>
            <Text style={styles.completeCardTitle}>{reflectionBoost.title}</Text>
            <Text style={styles.completeCardMessage}>
              {reflectionBoost.message}
            </Text>

            <View style={styles.completeActionBox}>
              <Text style={styles.completeActionLabel}>Try this next</Text>
              <Text style={styles.completeActionText}>
                {reflectionBoost.action}
              </Text>
            </View>

            <Text style={styles.completeResetText}>
              {reflectionBoost.reset}
            </Text>
          </View>

          <Text style={styles.resultMessage}>{followUpMessage}</Text>

          <TouchableOpacity
            style={styles.lockInButton}
            onPress={() => setScreen("followThrough")}
          >
            <Text style={styles.lockInButtonText}>Lock It In</Text>
          </TouchableOpacity>

          <View style={styles.followThroughRow}>
            <TouchableOpacity
              style={styles.followThroughButton}
              onPress={() => handleFollowThroughChoice(true)}
            >
              <Text style={styles.followThroughButtonText}>I did it</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.notYetButton}
              onPress={() => handleFollowThroughChoice(false)}
            >
              <Text style={styles.followThroughButtonText}>Not yet</Text>
            </TouchableOpacity>
          </View>
        </View>
      </SafeAreaView>
    );
  }

  if (screen === "followThrough") {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.centerContent}>
          <Text style={styles.title}>Nice Work</Text>

          <View style={styles.completeCard}>
            <Text style={styles.completeCardTitle}>
              {reflectionChoice === "controllable"
                ? "Momentum Matters"
                : "Peace Protected"}
            </Text>

            <Text style={styles.completeCardMessage}>
              {reflectionChoice === "controllable"
                ? "Even one small action builds momentum. You moved something forward, and that counts."
                : "Refocusing on what is yours is still progress. Protecting your peace is a real win."}
            </Text>

            <Text style={styles.completeResetText}>
              {reflectionChoice === "controllable"
                ? "Keep stacking small wins."
                : "Keep your energy where it belongs."}
            </Text>
          </View>

          <TouchableOpacity style={styles.submitButton} onPress={resetToHome}>
            <Text style={styles.submitButtonText}>Back Home</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      {showSuccessBanner && (
        <Animated.View
          style={[
            styles.successBanner,
            styles.floatingBanner,
            { opacity: bannerOpacity },
          ]}
        >
          <Text style={styles.successBannerText}>Check-in saved</Text>
        </Animated.View>
      )}

      <ScrollView
        contentContainerStyle={styles.homeScrollContent}
        showsVerticalScrollIndicator={false}
      >
        <Text style={styles.title}>How are you feeling?</Text>
        <Text style={styles.subtitle}>Check in with your stress level.</Text>

        <View style={styles.homeInsightCard}>
          <Text style={styles.homeInsightLabel}>Daily Encouragement</Text>
          <Text style={styles.homeInsightText}>{dailyEncouragement}</Text>
        </View>

        <View style={styles.homeStatsRow}>
          <View style={styles.homeStatCard}>
            <Text style={styles.homeStatEmoji}>🔥</Text>
            <Text style={styles.homeStatValue}>{dailyStreak}</Text>
            <Text style={styles.homeStatLabel}>Day Streak</Text>
          </View>

          <View style={styles.homeStatCard}>
            <Text style={styles.homeStatEmoji}>📝</Text>
            <Text style={styles.homeStatValue}>{savedCheckIns.length}</Text>
            <Text style={styles.homeStatLabel}>Total Check-Ins</Text>
          </View>
        </View>

        <View style={styles.homeMiniInsightCard}>
          <Text style={styles.homeMiniInsightLabel}>Mini Insight</Text>
          <Text style={styles.homeMiniInsightText}>{insightText}</Text>
        </View>

        <View style={styles.optionsContainer}>
          {stressOptions.map((option) => (
            <TouchableOpacity
              key={option.level}
              style={[
                styles.optionButton,
                selectedStress === option.level && styles.selectedButton,
              ]}
              onPress={() => setSelectedStress(option.level)}
            >
              <Text style={styles.emoji}>{option.emoji}</Text>
              <Text style={styles.optionLabel}>{option.label}</Text>
            </TouchableOpacity>
          ))}
        </View>

        <TextInput
          style={styles.input}
          placeholder="What's on your mind? (optional)"
          value={notes}
          onChangeText={setNotes}
          maxLength={200}
          multiline
          placeholderTextColor="#777"
          editable={!isSubmitting}
        />

        <Pressable
          style={({ pressed }) => [
            styles.submitButton,
            selectedStress === null && styles.disabledButton,
            isSubmitting && styles.loadingButton,
            pressed && !isSubmitting && selectedStress !== null
              ? styles.pressedButton
              : null,
          ]}
          disabled={selectedStress === null || isSubmitting}
          onPress={handleSubmit}
        >
          <Text style={styles.submitButtonText}>
            {isSubmitting ? "Saving..." : "Submit Check-In"}
          </Text>
        </Pressable>

        <TouchableOpacity style={styles.historyButton} onPress={openHistory}>
          <Text style={styles.historyButtonText}>View Saved Check-Ins</Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F8F5EF",
    paddingHorizontal: 20,
    paddingTop: 20,
  },
  centerContent: {
    flex: 1,
    justifyContent: "center",
  },
  homeScrollContent: {
    paddingBottom: 40,
  },
  historyScrollContent: {
    paddingBottom: 12,
  },
  title: {
    fontSize: 30,
    fontWeight: "700",
    color: "#1C2B2B",
    textAlign: "center",
    marginBottom: 10,
  },
  subtitle: {
    fontSize: 17,
    color: "#3D8B8B",
    textAlign: "center",
    marginBottom: 20,
  },
  homeInsightCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    padding: 16,
    marginBottom: 14,
  },
  homeInsightLabel: {
    fontSize: 12,
    fontWeight: "700",
    color: "#555",
    textTransform: "uppercase",
    marginBottom: 8,
    textAlign: "center",
  },
  homeInsightText: {
    fontSize: 16,
    color: "#3D8B8B",
    textAlign: "center",
    lineHeight: 24,
    fontWeight: "600",
  },
  homeStatsRow: {
    flexDirection: "row",
    gap: 12,
    marginBottom: 14,
  },
  homeStatCard: {
    flex: 1,
    backgroundColor: "#FFFFFF",
    borderRadius: 14,
    paddingVertical: 16,
    paddingHorizontal: 12,
    alignItems: "center",
  },
  homeStatEmoji: {
    fontSize: 22,
    marginBottom: 6,
  },
  homeStatValue: {
    fontSize: 24,
    fontWeight: "800",
    color: "#1C2B2B",
    marginBottom: 4,
  },
  homeStatLabel: {
    fontSize: 12,
    fontWeight: "700",
    color: "#555",
    textTransform: "uppercase",
    textAlign: "center",
  },
  homeMiniInsightCard: {
    backgroundColor: "#F4EFE6",
    borderRadius: 14,
    padding: 14,
    marginBottom: 18,
  },
  homeMiniInsightLabel: {
    fontSize: 12,
    fontWeight: "700",
    color: "#555",
    textTransform: "uppercase",
    marginBottom: 6,
    textAlign: "center",
  },
  homeMiniInsightText: {
    fontSize: 14,
    color: "#1C2B2B",
    textAlign: "center",
    lineHeight: 22,
    fontWeight: "600",
  },
  optionsContainer: {
    marginBottom: 20,
  },
  optionButton: {
    backgroundColor: "#FFFFFF",
    borderRadius: 14,
    paddingVertical: 16,
    paddingHorizontal: 14,
    marginBottom: 12,
    alignItems: "center",
    borderWidth: 2,
    borderColor: "transparent",
  },
  selectedButton: {
    borderColor: "#7A9E7E",
  },
  emoji: {
    fontSize: 34,
    marginBottom: 6,
  },
  optionLabel: {
    fontSize: 16,
    fontWeight: "600",
    color: "#1C2B2B",
  },
  input: {
    backgroundColor: "#FFFFFF",
    borderRadius: 14,
    padding: 14,
    fontSize: 15,
    color: "#1C2B2B",
    minHeight: 90,
    textAlignVertical: "top",
    marginBottom: 16,
  },
  submitButton: {
    backgroundColor: "#3D8B8B",
    borderRadius: 14,
    paddingVertical: 16,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 12,
  },
  disabledButton: {
    opacity: 0.5,
  },
  loadingButton: {
    opacity: 0.75,
  },
  pressedButton: {
    transform: [{ scale: 0.98 }],
  },
  submitButtonText: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "700",
  },
  resultLabel: {
    fontSize: 20,
    fontWeight: "600",
    color: "#1C2B2B",
    textAlign: "center",
    marginBottom: 16,
  },
  resultMessage: {
    fontSize: 18,
    color: "#3D8B8B",
    textAlign: "center",
    lineHeight: 26,
    marginBottom: 24,
  },
  breakTime: {
    fontSize: 16,
    color: "#1C2B2B",
    textAlign: "center",
    marginBottom: 14,
  },
  breakAction: {
    fontSize: 16,
    color: "#3D8B8B",
    textAlign: "center",
    lineHeight: 24,
    marginBottom: 24,
  },
  reflectionButton: {
    backgroundColor: "#7A9E7E",
    borderRadius: 14,
    paddingVertical: 16,
    paddingHorizontal: 14,
    alignItems: "center",
    marginBottom: 14,
  },
  secondaryButton: {
    backgroundColor: "#3D8B8B",
  },
  reflectionButtonText: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "700",
  },
  historyButton: {
    backgroundColor: "#7A9E7E",
    borderRadius: 14,
    paddingVertical: 14,
    alignItems: "center",
    marginBottom: 24,
  },
  historyButtonText: {
    color: "#FFFFFF",
    fontSize: 15,
    fontWeight: "700",
  },
  historyContainer: {
    flex: 1,
    marginBottom: 16,
  },
  historyCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 14,
    padding: 14,
    marginBottom: 12,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  historyMainContent: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    marginRight: 10,
  },
  historyEmoji: {
    fontSize: 28,
    marginRight: 14,
  },
  historyTextBlock: {
    flex: 1,
  },
  historyLabel: {
    fontSize: 16,
    fontWeight: "700",
    color: "#1C2B2B",
    marginBottom: 4,
  },
  badgeRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    marginBottom: 6,
    gap: 6,
  },
  completedBadge: {
    backgroundColor: "#7A9E7E",
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 5,
    alignSelf: "flex-start",
  },
  skippedBadge: {
    backgroundColor: "#D4715A",
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 5,
    alignSelf: "flex-start",
  },
  followThroughBadge: {
    backgroundColor: "#3D8B8B",
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 5,
    alignSelf: "flex-start",
  },
  notYetBadge: {
    backgroundColor: "#C49A3A",
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 5,
    alignSelf: "flex-start",
  },
  badgeText: {
    color: "#FFFFFF",
    fontSize: 12,
    fontWeight: "700",
  },
  historyNotes: {
    fontSize: 14,
    color: "#777",
    marginTop: 4,
    marginBottom: 4,
  },
  historySupportiveMessage: {
    fontSize: 14,
    color: "#3D8B8B",
    marginTop: 4,
    marginBottom: 4,
    fontWeight: "600",
  },
  historyBreakAction: {
    fontSize: 14,
    color: "#1C2B2B",
    marginTop: 2,
    marginBottom: 4,
  },
  historyTimestamp: {
    fontSize: 14,
    color: "#555",
  },
  deleteButton: {
    backgroundColor: "#D4715A",
    borderRadius: 10,
    paddingVertical: 8,
    paddingHorizontal: 12,
    alignSelf: "center",
  },
  deleteButtonText: {
    color: "#FFFFFF",
    fontSize: 13,
    fontWeight: "700",
  },
  scoreCard: {
    backgroundColor: "#3D8B8B",
    borderRadius: 16,
    padding: 18,
    marginBottom: 16,
  },
  scoreTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: "#FFFFFF",
    textAlign: "center",
    marginBottom: 8,
  },
  scoreValue: {
    fontSize: 46,
    fontWeight: "800",
    color: "#FFFFFF",
    textAlign: "center",
    marginBottom: 4,
  },
  scoreLabel: {
    fontSize: 16,
    fontWeight: "700",
    color: "#DDF4F4",
    textAlign: "center",
    marginBottom: 16,
  },
  scoreStatsRow: {
    gap: 10,
  },
  scoreStatBox: {
    backgroundColor: "rgba(255,255,255,0.14)",
    borderRadius: 12,
    padding: 12,
  },
  scoreStatLabel: {
    fontSize: 12,
    fontWeight: "700",
    color: "#DDF4F4",
    textTransform: "uppercase",
    marginBottom: 4,
  },
  scoreStatValue: {
    fontSize: 20,
    fontWeight: "800",
    color: "#FFFFFF",
  },
  chartCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 14,
    padding: 16,
    marginBottom: 16,
  },
  chartTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: "#1C2B2B",
    marginBottom: 10,
  },
  chartSubtext: {
    fontSize: 14,
    color: "#555",
    marginBottom: 14,
  },
  chartEmptyText: {
    fontSize: 14,
    color: "#777",
  },
  trendChartBox: {
    minHeight: 180,
    backgroundColor: "#F4EFE6",
    borderRadius: 14,
    paddingVertical: 16,
    paddingHorizontal: 10,
    flexDirection: "row",
    alignItems: "flex-end",
    justifyContent: "space-around",
  },
  trendBarGroup: {
    alignItems: "center",
    justifyContent: "flex-end",
    flex: 1,
  },
  trendValue: {
    fontSize: 12,
    fontWeight: "700",
    color: "#1C2B2B",
    marginBottom: 6,
  },
  trendBarTrack: {
    width: 24,
    height: 118,
    backgroundColor: "#E6E1D8",
    borderRadius: 999,
    justifyContent: "flex-end",
    overflow: "hidden",
    marginBottom: 8,
  },
  trendBarFill: {
    width: "100%",
    backgroundColor: "#3D8B8B",
    borderRadius: 999,
  },
  trendBarLabel: {
    fontSize: 12,
    color: "#555",
    fontWeight: "600",
  },
  summaryCountRow: {
    flexDirection: "row",
    gap: 10,
    marginBottom: 14,
  },
  summaryCountCard: {
    flex: 1,
    backgroundColor: "#FFFFFF",
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 10,
    alignItems: "center",
  },
  summaryCountLabel: {
    fontSize: 12,
    fontWeight: "700",
    color: "#555",
    textTransform: "uppercase",
    marginBottom: 4,
  },
  summaryCountValue: {
    fontSize: 22,
    fontWeight: "800",
    color: "#3D8B8B",
  },
  filterRow: {
    flexDirection: "row",
    gap: 10,
    marginBottom: 16,
  },
  filterButton: {
    flex: 1,
    backgroundColor: "#E6E1D8",
    borderRadius: 999,
    paddingVertical: 12,
    alignItems: "center",
  },
  activeFilterButton: {
    backgroundColor: "#3D8B8B",
  },
  filterButtonText: {
    color: "#1C2B2B",
    fontSize: 14,
    fontWeight: "700",
  },
  activeFilterButtonText: {
    color: "#FFFFFF",
  },
  successBanner: {
    backgroundColor: "#7A9E7E",
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 12,
    alignItems: "center",
  },
  floatingBanner: {
    position: "absolute",
    top: 20,
    left: 20,
    right: 20,
    zIndex: 1000,
    elevation: 5,
  },
  successBannerText: {
    color: "#FFFFFF",
    fontSize: 15,
    fontWeight: "700",
  },
  clearButton: {
    backgroundColor: "#D4715A",
  },
  supportiveCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 14,
    padding: 16,
    marginBottom: 20,
  },
  supportiveCardTitle: {
    fontSize: 15,
    fontWeight: "700",
    color: "#1C2B2B",
    textAlign: "center",
    marginBottom: 8,
  },
  supportiveCardText: {
    fontSize: 16,
    color: "#3D8B8B",
    textAlign: "center",
    lineHeight: 24,
  },
  timerCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 14,
    padding: 16,
    marginBottom: 20,
  },
  timerLabel: {
    fontSize: 15,
    fontWeight: "700",
    color: "#1C2B2B",
    textAlign: "center",
    marginBottom: 8,
  },
  timerText: {
    fontSize: 40,
    fontWeight: "800",
    color: "#3D8B8B",
    textAlign: "center",
    marginBottom: 16,
  },
  timerAdjustRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    gap: 12,
    marginBottom: 12,
  },
  timerAdjustButton: {
    flex: 1,
    backgroundColor: "#F4EFE6",
    borderRadius: 12,
    paddingVertical: 12,
    alignItems: "center",
  },
  timerAdjustButtonText: {
    color: "#1C2B2B",
    fontSize: 14,
    fontWeight: "700",
  },
  resetTimerButton: {
    backgroundColor: "#E6E1D8",
    borderRadius: 12,
    paddingVertical: 12,
    alignItems: "center",
    marginBottom: 12,
  },
  resetTimerButtonText: {
    color: "#1C2B2B",
    fontSize: 14,
    fontWeight: "700",
  },
  timerPrimaryButton: {
    backgroundColor: "#7A9E7E",
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: "center",
    marginBottom: 12,
  },
  timerPrimaryButtonText: {
    color: "#FFFFFF",
    fontSize: 15,
    fontWeight: "700",
  },
  skipButton: {
    backgroundColor: "#D4715A",
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: "center",
  },
  skipButtonText: {
    color: "#FFFFFF",
    fontSize: 15,
    fontWeight: "700",
  },
  insightRow: {
    marginBottom: 16,
  },
  insightBox: {
    backgroundColor: "#F4EFE6",
    borderRadius: 12,
    padding: 14,
    marginBottom: 10,
  },
  insightLabel: {
    fontSize: 13,
    fontWeight: "700",
    color: "#1C2B2B",
    marginBottom: 6,
    textTransform: "uppercase",
  },
  insightValue: {
    fontSize: 22,
    fontWeight: "800",
    color: "#3D8B8B",
  },
  insightText: {
    fontSize: 14,
    color: "#1C2B2B",
    lineHeight: 21,
  },
  completeCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 14,
    padding: 18,
    marginBottom: 20,
  },
  completeCardTitle: {
    fontSize: 20,
    fontWeight: "800",
    color: "#1C2B2B",
    textAlign: "center",
    marginBottom: 10,
  },
  completeCardMessage: {
    fontSize: 15,
    color: "#3D8B8B",
    textAlign: "center",
    lineHeight: 24,
    marginBottom: 14,
  },
  completeActionBox: {
    backgroundColor: "#F4EFE6",
    borderRadius: 12,
    padding: 14,
    marginBottom: 12,
  },
  completeActionLabel: {
    fontSize: 12,
    fontWeight: "700",
    color: "#555",
    textTransform: "uppercase",
    marginBottom: 6,
    textAlign: "center",
  },
  completeActionText: {
    fontSize: 15,
    color: "#1C2B2B",
    lineHeight: 22,
    textAlign: "center",
    fontWeight: "600",
  },
  completeResetText: {
    fontSize: 14,
    color: "#3D8B8B",
    textAlign: "center",
    lineHeight: 22,
    fontWeight: "600",
  },
  followThroughRow: {
    flexDirection: "row",
    gap: 12,
  },
  followThroughButton: {
    flex: 1,
    backgroundColor: "#7A9E7E",
    borderRadius: 14,
    paddingVertical: 16,
    alignItems: "center",
  },
  notYetButton: {
    flex: 1,
    backgroundColor: "#C49A3A",
    borderRadius: 14,
    paddingVertical: 16,
    alignItems: "center",
  },
  followThroughButtonText: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "700",
  },
  momentumWrap: {
    marginBottom: 16,
  },
  momentumLabel: {
    fontSize: 13,
    fontWeight: "700",
    color: "#1C2B2B",
    textAlign: "center",
    marginBottom: 8,
    textTransform: "uppercase",
  },
  momentumTrack: {
    height: 12,
    backgroundColor: "#E6E1D8",
    borderRadius: 999,
    overflow: "hidden",
  },
  momentumFill: {
    height: "100%",
    backgroundColor: "#7A9E7E",
    borderRadius: 999,
  },
  lockInButton: {
    backgroundColor: "#1C2B2B",
    borderRadius: 14,
    paddingVertical: 16,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 12,
  },
  lockInButtonText: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "700",
  },
});