import AsyncStorage from "@react-native-async-storage/async-storage";
import { useEffect, useMemo, useState } from "react";
import {
  Alert,
  Animated,
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
  | "actionPlan"
  | "resetPlan"
  | "resetGuide"
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
  reflectionChoice?: ReflectionChoice;
  selectedActionTitle?: string;
  selectedActionDescription?: string;
  actionCategory?: string;
  selectedResetTitle?: string;
  selectedResetDescription?: string;
  resetCategory?: string;
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

type MicroAction = {
  id: string;
  title: string;
  description: string;
  category: string;
};

type ResetOption = {
  id: string;
  title: string;
  description: string;
  category: string;
  steps: string[];
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

  const [microActions, setMicroActions] = useState<MicroAction[]>([]);
  const [selectedMicroAction, setSelectedMicroAction] =
    useState<MicroAction | null>(null);

  const [resetOptions, setResetOptions] = useState<ResetOption[]>([]);
  const [selectedResetOption, setSelectedResetOption] =
    useState<ResetOption | null>(null);

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
          "That is good news. If it is in your hands, you already have a path forward. You do not need a perfect fix. You just need one clean next move.",
        action:
          "Choose one small action and complete only that first step.",
        reset:
          "Keep it simple. One completed move can shift your whole state.",
      };
    }

    return {
      title: "Let It Go",
      message:
        "Not everything deserves your energy. Releasing what is not yours is part of protecting your peace.",
      action:
        "Choose one reset practice and let your body and mind step out of the spiral.",
      reset:
        "You do not have to solve what was never yours to carry.",
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
        reflectionChoice: null,
        selectedActionTitle: "",
        selectedActionDescription: "",
        actionCategory: "",
        selectedResetTitle: "",
        selectedResetDescription: "",
        resetCategory: "",
      };

      const updatedCheckIns = [...parsedCheckIns, newCheckIn];
      await AsyncStorage.setItem("checkins", JSON.stringify(updatedCheckIns));

      return newCheckIn.id;
    } catch (error) {
      console.log("Error saving check-in:", error);
      return null;
    }
  };

  const updateCheckInFields = async (
    id: string,
    updates: Partial<CheckIn>
  ) => {
    try {
      const existingCheckIns = await AsyncStorage.getItem("checkins");
      const parsedCheckIns: CheckIn[] = existingCheckIns
        ? JSON.parse(existingCheckIns)
        : [];

      const updatedCheckIns = parsedCheckIns.map((checkIn) =>
        checkIn.id === id ? { ...checkIn, ...updates } : checkIn
      );

      await AsyncStorage.setItem("checkins", JSON.stringify(updatedCheckIns));

      const sortedCheckIns = [...updatedCheckIns].sort(
        (a, b) =>
          new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
      );

      setSavedCheckIns(sortedCheckIns);
      setStressStats(buildStressStats(updatedCheckIns));
    } catch (error) {
      console.log("Error updating check-in fields:", error);
    }
  };

  const updateBreakCompletionStatus = async (
    id: string,
    completed: boolean
  ) => {
    await updateCheckInFields(id, { breakCompleted: completed });
  };

  const updateFollowThroughStatus = async (
    id: string,
    completed: boolean
  ) => {
    await updateCheckInFields(id, { followThroughCompleted: completed });
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

  const buildMicroActions = (
    stressLevel: number,
    noteText: string
  ): MicroAction[] => {
    const mentionsCommunication =
      noteText.toLowerCase().includes("email") ||
      noteText.toLowerCase().includes("text") ||
      noteText.toLowerCase().includes("message") ||
      noteText.toLowerCase().includes("call") ||
      noteText.toLowerCase().includes("boss") ||
      noteText.toLowerCase().includes("coworker");

    const mentionsWorkload =
      noteText.toLowerCase().includes("assignment") ||
      noteText.toLowerCase().includes("deadline") ||
      noteText.toLowerCase().includes("project") ||
      noteText.toLowerCase().includes("work") ||
      noteText.toLowerCase().includes("task");

    const generalActions: MicroAction[] = [
      {
        id: "clarify",
        title: "Clarify the next step",
        description:
          "Write down the one exact thing that needs to happen next.",
        category: "Focus",
      },
      {
        id: "start5",
        title: "Do 5 minutes only",
        description:
          "Set a short start point and work for 5 minutes with no pressure.",
        category: "Momentum",
      },
      {
        id: "reduce",
        title: "Shrink the task",
        description:
          "Break the problem into one smaller piece you can finish now.",
        category: "Reset",
      },
    ];

    const communicationActions: MicroAction[] = [
      {
        id: "draft",
        title: "Draft the message",
        description:
          "Write the message you need to send without worrying about perfection.",
        category: "Communication",
      },
      {
        id: "ask",
        title: "Ask for clarity",
        description:
          "Send one quick question so you are not carrying uncertainty alone.",
        category: "Support",
      },
      {
        id: "boundary",
        title: "Set one boundary",
        description:
          "Decide what you will respond to now and what can wait until later.",
        category: "Boundaries",
      },
    ];

    const workloadActions: MicroAction[] = [
      {
        id: "top1",
        title: "Pick the top priority",
        description:
          "Choose the most important task and ignore the rest for now.",
        category: "Priority",
      },
      {
        id: "firststep",
        title: "Complete the first small step",
        description:
          "Open the file, outline the task, or begin the first simple part.",
        category: "Execution",
      },
      {
        id: "timer",
        title: "Run a short focus block",
        description:
          "Give yourself one focused block before deciding what comes next.",
        category: "Momentum",
      },
    ];

    if (mentionsCommunication) {
      return communicationActions;
    }

    if (mentionsWorkload || stressLevel >= 4) {
      return workloadActions;
    }

    return generalActions;
  };

  const buildResetOptions = (stressLevel: number): ResetOption[] => {
    const breathingReset: ResetOption = {
      id: "breathe",
      title: "Take a breathing reset",
      description:
        "Use your breath to slow your body down and create space.",
      category: "Breathing",
      steps: [
        "Inhale slowly through your nose for 4 seconds.",
        "Hold for 4 seconds.",
        "Exhale slowly for 6 seconds.",
        "Repeat this cycle 3 times and let your shoulders drop.",
      ],
    };

    const reframeReset: ResetOption = {
      id: "reframe",
      title: "Reframe the thought",
      description:
        "Shift your attention away from what you cannot control.",
      category: "Mindset",
      steps: [
        "Name the stressor in one sentence.",
        "Say to yourself: This is real, but it is not mine to carry.",
        "Ask: What is still in my control right now?",
        "Choose one thing you can return your energy to.",
      ],
    };

    const groundingReset: ResetOption = {
      id: "ground",
      title: "Ground in the present",
      description:
        "Bring your attention back to your body and surroundings.",
      category: "Grounding",
      steps: [
        "Notice 3 things you can see.",
        "Notice 2 things you can physically feel.",
        "Take 1 slow breath and unclench your jaw.",
        "Plant your feet and remind yourself: I am safe in this moment.",
      ],
    };

    if (stressLevel >= 4) {
      return [breathingReset, groundingReset, reframeReset];
    }

    return [reframeReset, breathingReset, groundingReset];
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
      setSelectedMicroAction(null);
      setMicroActions([]);
      setSelectedResetOption(null);
      setResetOptions([]);

      const currentNotes = notes;

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
        setMicroActions(buildMicroActions(selectedStress, currentNotes));
        setResetOptions(buildResetOptions(selectedStress));
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
      setFollowUpMessage("Good. Let me decide what to do about this.");
    } else {
      setFollowUpMessage("That is not mine to carry. Let them.");
    }

    setReflectionBoost(getReflectionBoost(choice));

    if (currentCheckInId) {
      await saveReflection(currentCheckInId, choice);
      await updateCheckInFields(currentCheckInId, {
        reflectionChoice: choice,
      });
    }

    if (choice === "controllable") {
      if (microActions.length === 0) {
        setMicroActions(buildMicroActions(selectedStress ?? 3, notes));
      }
      setScreen("actionPlan");
      return;
    }

    if (resetOptions.length === 0) {
      setResetOptions(buildResetOptions(selectedStress ?? 3));
    }

    setSelectedResetOption(null);
    setScreen("resetPlan");
  };

  const handleConfirmMicroAction = async () => {
    if (!selectedMicroAction) {
      Alert.alert("Pick One Action", "Choose one micro-action to move forward.");
      return;
    }

    if (currentCheckInId) {
      await updateCheckInFields(currentCheckInId, {
        selectedActionTitle: selectedMicroAction.title,
        selectedActionDescription: selectedMicroAction.description,
        actionCategory: selectedMicroAction.category,
      });
    }

    setReflectionBoost({
      title: "Action Chosen",
      message:
        "You do not need to solve everything right now. You already made the hardest move by choosing a next step.",
      action: selectedMicroAction.title,
      reset: selectedMicroAction.description,
    });

    setScreen("complete");
  };

  const handleConfirmResetOption = async () => {
    if (!selectedResetOption) {
      Alert.alert("Pick One Reset", "Choose one reset flow to continue.");
      return;
    }

    if (currentCheckInId) {
      await updateCheckInFields(currentCheckInId, {
        selectedResetTitle: selectedResetOption.title,
        selectedResetDescription: selectedResetOption.description,
        resetCategory: selectedResetOption.category,
      });
    }

    setScreen("resetGuide");
  };

  const finishResetFlow = () => {
    if (!selectedResetOption) {
      return;
    }

    setReflectionBoost({
      title: "Reset Complete",
      message:
        "You just interrupted the spiral. That matters. You gave your mind something steadier to return to.",
      action: selectedResetOption.title,
      reset:
        "You do not have to chase every stressor. Come back to yourself first.",
    });

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

  const resetToHome = () => {
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
    setMicroActions([]);
    setSelectedMicroAction(null);
    setResetOptions([]);
    setSelectedResetOption(null);
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

  useEffect(() => {
    if (screen === "history") {
      getCheckIns();
    }
  }, [screen]);

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

                    {checkIn.selectedActionTitle ? (
                      <View style={styles.historyActionCard}>
                        <Text style={styles.historyActionTitle}>
                          Chosen Action
                        </Text>
                        <Text style={styles.historyActionText}>
                          {checkIn.selectedActionTitle}
                        </Text>
                        {checkIn.selectedActionDescription ? (
                          <Text style={styles.historyActionSubtext}>
                            {checkIn.selectedActionDescription}
                          </Text>
                        ) : null}
                      </View>
                    ) : null}

                    {checkIn.selectedResetTitle ? (
                      <View style={styles.historyActionCard}>
                        <Text style={styles.historyActionTitle}>
                          Reset Practice
                        </Text>
                        <Text style={styles.historyActionText}>
                          {checkIn.selectedResetTitle}
                        </Text>
                        {checkIn.selectedResetDescription ? (
                          <Text style={styles.historyActionSubtext}>
                            {checkIn.selectedResetDescription}
                          </Text>
                        ) : null}
                      </View>
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

          <TouchableOpacity style={styles.secondaryButton} onPress={openHistory}>
            <Text style={styles.secondaryButtonText}>View History</Text>
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
              style={styles.timerControlButton}
              onPress={startOrPauseBreak}
            >
              <Text style={styles.timerControlButtonText}>
                {isBreakRunning ? "Pause Break" : "Resume Break"}
              </Text>
            </TouchableOpacity>

            {breakFinished ? (
              <TouchableOpacity
                style={styles.submitButton}
                onPress={continueAfterCompletedBreak}
              >
                <Text style={styles.submitButtonText}>Continue</Text>
              </TouchableOpacity>
            ) : (
              <TouchableOpacity
                style={styles.secondaryButton}
                onPress={skipBreak}
              >
                <Text style={styles.secondaryButtonText}>Skip Break</Text>
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

          <View style={styles.reflectionCard}>
            <Text style={styles.reflectionPrompt}>
              Choose the path that fits this moment.
            </Text>

            <TouchableOpacity
              style={styles.submitButton}
              onPress={() => handleReflectionChoice("controllable")}
            >
              <Text style={styles.submitButtonText}>Yes, I can act</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.secondaryButton}
              onPress={() => handleReflectionChoice("uncontrollable")}
            >
              <Text style={styles.secondaryButtonText}>No, let them</Text>
            </TouchableOpacity>
          </View>
        </View>
      </SafeAreaView>
    );
  }

  if (screen === "actionPlan") {
    return (
      <SafeAreaView style={styles.container}>
        <ScrollView
          style={styles.historyContainer}
          contentContainerStyle={styles.historyScrollContent}
          showsVerticalScrollIndicator={false}
        >
          <Text style={styles.title}>Choose Your Next Step</Text>
          <Text style={styles.resultMessage}>{followUpMessage}</Text>

          <View style={styles.supportiveCard}>
            <Text style={styles.supportiveCardTitle}>Guided Action</Text>
            <Text style={styles.supportiveCardText}>
              Pick one micro-action you can realistically do next.
            </Text>
          </View>

          {microActions.map((action) => {
            const isSelected = selectedMicroAction?.id === action.id;

            return (
              <TouchableOpacity
                key={action.id}
                style={[
                  styles.actionOptionCard,
                  isSelected && styles.actionOptionCardSelected,
                ]}
                onPress={() => setSelectedMicroAction(action)}
              >
                <View style={styles.actionOptionHeader}>
                  <Text style={styles.actionOptionTitle}>{action.title}</Text>
                  <View
                    style={[
                      styles.categoryBadge,
                      isSelected && styles.categoryBadgeSelected,
                    ]}
                  >
                    <Text
                      style={[
                        styles.categoryBadgeText,
                        isSelected && styles.categoryBadgeTextSelected,
                      ]}
                    >
                      {action.category}
                    </Text>
                  </View>
                </View>

                <Text style={styles.actionOptionDescription}>
                  {action.description}
                </Text>
              </TouchableOpacity>
            );
          })}

          <TouchableOpacity
            style={styles.submitButton}
            onPress={handleConfirmMicroAction}
          >
            <Text style={styles.submitButtonText}>Use This Action</Text>
          </TouchableOpacity>
        </ScrollView>
      </SafeAreaView>
    );
  }

  if (screen === "resetPlan") {
    return (
      <SafeAreaView style={styles.container}>
        <ScrollView
          style={styles.historyContainer}
          contentContainerStyle={styles.historyScrollContent}
          showsVerticalScrollIndicator={false}
        >
          <Text style={styles.title}>Mental Reset</Text>
          <Text style={styles.resultMessage}>{followUpMessage}</Text>

          <View style={styles.supportiveCard}>
            <Text style={styles.supportiveCardTitle}>Release The Weight</Text>
            <Text style={styles.supportiveCardText}>
              Pick a reset flow to help your body and mind let go of what is not yours.
            </Text>
          </View>

          {resetOptions.map((option) => {
            const isSelected = selectedResetOption?.id === option.id;

            return (
              <TouchableOpacity
                key={option.id}
                style={[
                  styles.actionOptionCard,
                  isSelected && styles.actionOptionCardSelected,
                ]}
                onPress={() => setSelectedResetOption(option)}
              >
                <View style={styles.actionOptionHeader}>
                  <Text style={styles.actionOptionTitle}>{option.title}</Text>
                  <View
                    style={[
                      styles.categoryBadge,
                      isSelected && styles.categoryBadgeSelected,
                    ]}
                  >
                    <Text
                      style={[
                        styles.categoryBadgeText,
                        isSelected && styles.categoryBadgeTextSelected,
                      ]}
                    >
                      {option.category}
                    </Text>
                  </View>
                </View>

                <Text style={styles.actionOptionDescription}>
                  {option.description}
                </Text>
              </TouchableOpacity>
            );
          })}

          <TouchableOpacity
            style={styles.submitButton}
            onPress={handleConfirmResetOption}
          >
            <Text style={styles.submitButtonText}>Start Reset Flow</Text>
          </TouchableOpacity>
        </ScrollView>
      </SafeAreaView>
    );
  }

  if (screen === "resetGuide") {
    return (
      <SafeAreaView style={styles.container}>
        <ScrollView
          style={styles.historyContainer}
          contentContainerStyle={styles.historyScrollContent}
          showsVerticalScrollIndicator={false}
        >
          <Text style={styles.title}>
            {selectedResetOption?.title || "Reset Guide"}
          </Text>

          {selectedResetOption ? (
            <>
              <View style={styles.selectedActionCard}>
                <Text style={styles.selectedActionLabel}>Chosen Reset</Text>
                <Text style={styles.selectedActionTitle}>
                  {selectedResetOption.title}
                </Text>
                <Text style={styles.selectedActionDescription}>
                  {selectedResetOption.description}
                </Text>
              </View>

              <View style={styles.guideCard}>
                <Text style={styles.guideCardTitle}>Follow These Steps</Text>

                {selectedResetOption.steps.map((step, index) => (
                  <View key={`${selectedResetOption.id}-${index}`} style={styles.guideStepRow}>
                    <View style={styles.guideStepNumber}>
                      <Text style={styles.guideStepNumberText}>{index + 1}</Text>
                    </View>
                    <Text style={styles.guideStepText}>{step}</Text>
                  </View>
                ))}
              </View>

              <TouchableOpacity
                style={styles.submitButton}
                onPress={finishResetFlow}
              >
                <Text style={styles.submitButtonText}>I feel more reset</Text>
              </TouchableOpacity>
            </>
          ) : (
            <TouchableOpacity
              style={styles.submitButton}
              onPress={() => setScreen("resetPlan")}
            >
              <Text style={styles.submitButtonText}>Back</Text>
            </TouchableOpacity>
          )}
        </ScrollView>
      </SafeAreaView>
    );
  }

  if (screen === "complete") {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.centerContent}>
          <Text style={styles.title}>{reflectionBoost.title}</Text>
          <Text style={styles.resultMessage}>{reflectionBoost.message}</Text>

          {selectedMicroAction ? (
            <View style={styles.selectedActionCard}>
              <Text style={styles.selectedActionLabel}>Your Chosen Action</Text>
              <Text style={styles.selectedActionTitle}>
                {selectedMicroAction.title}
              </Text>
              <Text style={styles.selectedActionDescription}>
                {selectedMicroAction.description}
              </Text>
            </View>
          ) : null}

          {selectedResetOption ? (
            <View style={styles.selectedActionCard}>
              <Text style={styles.selectedActionLabel}>Your Reset Practice</Text>
              <Text style={styles.selectedActionTitle}>
                {selectedResetOption.title}
              </Text>
              <Text style={styles.selectedActionDescription}>
                {selectedResetOption.description}
              </Text>
            </View>
          ) : null}

          <View style={styles.supportiveCard}>
            <Text style={styles.supportiveCardTitle}>Keep This With You</Text>
            <Text style={styles.supportiveCardText}>{reflectionBoost.action}</Text>
            <Text style={styles.supportiveCardSubtext}>
              {reflectionBoost.reset}
            </Text>
          </View>

          <TouchableOpacity
            style={styles.submitButton}
            onPress={() => setScreen("followThrough")}
          >
            <Text style={styles.submitButtonText}>Continue</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  if (screen === "followThrough") {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.centerContent}>
          <Text style={styles.title}>Follow Through</Text>

          {selectedMicroAction ? (
            <View style={styles.selectedActionCard}>
              <Text style={styles.selectedActionLabel}>Your Action</Text>
              <Text style={styles.selectedActionTitle}>
                {selectedMicroAction.title}
              </Text>
              <Text style={styles.selectedActionDescription}>
                {selectedMicroAction.description}
              </Text>
            </View>
          ) : null}

          {selectedResetOption ? (
            <View style={styles.selectedActionCard}>
              <Text style={styles.selectedActionLabel}>Your Reset</Text>
              <Text style={styles.selectedActionTitle}>
                {selectedResetOption.title}
              </Text>
              <Text style={styles.selectedActionDescription}>
                {selectedResetOption.description}
              </Text>
            </View>
          ) : null}

          <Text style={styles.resultMessage}>
            Did you follow through on your next step?
          </Text>

          <TouchableOpacity
            style={styles.submitButton}
            onPress={() => handleFollowThroughChoice(true)}
          >
            <Text style={styles.submitButtonText}>I did it</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.secondaryButton}
            onPress={() => handleFollowThroughChoice(false)}
          >
            <Text style={styles.secondaryButtonText}>Not yet</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.ghostButton} onPress={resetToHome}>
            <Text style={styles.ghostButtonText}>Back Home</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      {showSuccessBanner ? (
        <Animated.View style={[styles.successBanner, { opacity: bannerOpacity }]}>
          <Text style={styles.successBannerText}>Check-in saved</Text>
        </Animated.View>
      ) : null}

      <ScrollView
        style={styles.historyContainer}
        contentContainerStyle={styles.homeScrollContent}
        showsVerticalScrollIndicator={false}
      >
        <Text style={styles.title}>Pulse Break</Text>
        <Text style={styles.subtitle}>How are you feeling right now?</Text>

        <View style={styles.stressOptionsRow}>
          {stressOptions.map((option) => {
            const isSelected = selectedStress === option.level;

            return (
              <TouchableOpacity
                key={option.level}
                style={[
                  styles.stressOption,
                  isSelected && styles.selectedStressOption,
                ]}
                onPress={() => setSelectedStress(option.level)}
              >
                <Text style={styles.stressEmoji}>{option.emoji}</Text>
                <Text
                  style={[
                    styles.stressLabel,
                    isSelected && styles.selectedStressLabel,
                  ]}
                >
                  {option.label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>

        <View style={styles.inputCard}>
          <Text style={styles.inputLabel}>What is on your mind?</Text>
          <TextInput
            style={styles.textInput}
            placeholder="Optional note"
            placeholderTextColor="#7b8a8a"
            multiline
            maxLength={200}
            value={notes}
            onChangeText={setNotes}
          />
          <Text style={styles.characterCount}>{notes.length}/200</Text>
        </View>

        <TouchableOpacity style={styles.submitButton} onPress={handleSubmit}>
          <Text style={styles.submitButtonText}>
            {isSubmitting ? "Saving..." : "Log Check-In"}
          </Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.secondaryButton} onPress={openHistory}>
          <Text style={styles.secondaryButtonText}>View Saved Check-Ins</Text>
        </TouchableOpacity>

        {stressStats.length > 0 ? (
          <View style={styles.summaryCard}>
            <Text style={styles.summaryTitle}>Quick Summary</Text>
            {stressStats.map((stat) => (
              <View key={stat.label} style={styles.summaryRow}>
                <Text style={styles.summaryLabel}>{stat.label}</Text>
                <Text style={styles.summaryValue}>{stat.count}</Text>
              </View>
            ))}
          </View>
        ) : null}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F6F3EC",
    paddingHorizontal: 20,
    paddingTop: 18,
  },
  centerContent: {
    flex: 1,
    justifyContent: "center",
  },
  homeScrollContent: {
    paddingBottom: 30,
  },
  historyContainer: {
    flex: 1,
  },
  historyScrollContent: {
    paddingBottom: 30,
  },
  title: {
    fontSize: 30,
    fontWeight: "800",
    color: "#1B2B2B",
    marginBottom: 10,
    textAlign: "center",
  },
  subtitle: {
    fontSize: 17,
    color: "#476161",
    textAlign: "center",
    marginBottom: 22,
  },
  stressOptionsRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    gap: 8,
    marginBottom: 22,
  },
  stressOption: {
    flex: 1,
    backgroundColor: "#FFFFFF",
    borderRadius: 18,
    paddingVertical: 16,
    paddingHorizontal: 8,
    alignItems: "center",
    borderWidth: 2,
    borderColor: "#D7E0DB",
  },
  selectedStressOption: {
    borderColor: "#6E9C83",
    backgroundColor: "#EAF3EE",
  },
  stressEmoji: {
    fontSize: 28,
    marginBottom: 8,
  },
  stressLabel: {
    fontSize: 12,
    fontWeight: "600",
    color: "#425A5A",
    textAlign: "center",
  },
  selectedStressLabel: {
    color: "#214A36",
  },
  inputCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 18,
    padding: 16,
    marginBottom: 18,
    borderWidth: 1,
    borderColor: "#E0E7E2",
  },
  inputLabel: {
    fontSize: 15,
    fontWeight: "700",
    color: "#1B2B2B",
    marginBottom: 10,
  },
  textInput: {
    minHeight: 100,
    borderRadius: 14,
    backgroundColor: "#F5F7F6",
    padding: 14,
    fontSize: 15,
    color: "#1B2B2B",
    textAlignVertical: "top",
  },
  characterCount: {
    marginTop: 8,
    textAlign: "right",
    color: "#6B7C7C",
    fontSize: 12,
  },
  submitButton: {
    backgroundColor: "#6E9C83",
    paddingVertical: 16,
    borderRadius: 16,
    alignItems: "center",
    marginTop: 8,
  },
  submitButtonText: {
    color: "#FFFFFF",
    fontWeight: "800",
    fontSize: 16,
  },
  secondaryButton: {
    backgroundColor: "#E5ECE8",
    paddingVertical: 16,
    borderRadius: 16,
    alignItems: "center",
    marginTop: 12,
  },
  secondaryButtonText: {
    color: "#244040",
    fontWeight: "800",
    fontSize: 16,
  },
  ghostButton: {
    marginTop: 14,
    alignItems: "center",
  },
  ghostButtonText: {
    color: "#476161",
    fontWeight: "700",
    fontSize: 15,
  },
  supportiveCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 18,
    padding: 16,
    marginTop: 18,
    borderWidth: 1,
    borderColor: "#E0E7E2",
  },
  supportiveCardTitle: {
    fontSize: 15,
    fontWeight: "800",
    color: "#1B2B2B",
    marginBottom: 8,
  },
  supportiveCardText: {
    fontSize: 15,
    color: "#365050",
    lineHeight: 22,
  },
  supportiveCardSubtext: {
    marginTop: 10,
    fontSize: 14,
    color: "#5C6E6E",
    lineHeight: 20,
  },
  resultLabel: {
    fontSize: 18,
    fontWeight: "800",
    color: "#355353",
    textAlign: "center",
    marginBottom: 10,
  },
  resultMessage: {
    fontSize: 16,
    color: "#3F5656",
    lineHeight: 24,
    textAlign: "center",
  },
  breakTime: {
    marginTop: 18,
    fontSize: 18,
    fontWeight: "800",
    textAlign: "center",
    color: "#1B2B2B",
  },
  breakAction: {
    marginTop: 10,
    fontSize: 15,
    lineHeight: 22,
    textAlign: "center",
    color: "#486060",
  },
  timerCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 20,
    padding: 18,
    marginTop: 22,
    borderWidth: 1,
    borderColor: "#E0E7E2",
  },
  timerLabel: {
    fontSize: 15,
    fontWeight: "800",
    color: "#1B2B2B",
    textAlign: "center",
  },
  timerText: {
    fontSize: 42,
    fontWeight: "800",
    color: "#244040",
    textAlign: "center",
    marginTop: 8,
    marginBottom: 14,
  },
  timerAdjustRow: {
    flexDirection: "row",
    gap: 10,
    justifyContent: "center",
  },
  timerAdjustButton: {
    flex: 1,
    backgroundColor: "#EEF2F0",
    borderRadius: 14,
    paddingVertical: 12,
    alignItems: "center",
  },
  timerAdjustButtonText: {
    color: "#284444",
    fontWeight: "700",
  },
  resetTimerButton: {
    backgroundColor: "#EFF4F1",
    paddingVertical: 14,
    borderRadius: 14,
    alignItems: "center",
    marginTop: 12,
  },
  resetTimerButtonText: {
    color: "#244040",
    fontWeight: "800",
  },
  timerControlButton: {
    backgroundColor: "#DCEAE2",
    paddingVertical: 14,
    borderRadius: 14,
    alignItems: "center",
    marginTop: 12,
  },
  timerControlButtonText: {
    color: "#244040",
    fontWeight: "800",
  },
  reflectionCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 20,
    padding: 18,
    marginTop: 20,
    borderWidth: 1,
    borderColor: "#E0E7E2",
  },
  reflectionPrompt: {
    textAlign: "center",
    fontSize: 15,
    lineHeight: 22,
    color: "#486060",
    marginBottom: 6,
  },
  actionOptionCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 18,
    padding: 16,
    marginTop: 14,
    borderWidth: 1.5,
    borderColor: "#E0E7E2",
  },
  actionOptionCardSelected: {
    borderColor: "#6E9C83",
    backgroundColor: "#EAF3EE",
  },
  actionOptionHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    gap: 12,
    alignItems: "center",
    marginBottom: 8,
  },
  actionOptionTitle: {
    flex: 1,
    fontSize: 16,
    fontWeight: "800",
    color: "#1B2B2B",
  },
  actionOptionDescription: {
    fontSize: 14,
    lineHeight: 21,
    color: "#4B6262",
  },
  categoryBadge: {
    backgroundColor: "#EDF2EF",
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
  },
  categoryBadgeSelected: {
    backgroundColor: "#6E9C83",
  },
  categoryBadgeText: {
    fontSize: 12,
    fontWeight: "700",
    color: "#4B6262",
  },
  categoryBadgeTextSelected: {
    color: "#FFFFFF",
  },
  selectedActionCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 18,
    padding: 16,
    marginTop: 18,
    borderWidth: 1,
    borderColor: "#D6E6DD",
  },
  selectedActionLabel: {
    fontSize: 13,
    fontWeight: "800",
    color: "#5C7474",
    marginBottom: 6,
    textAlign: "center",
  },
  selectedActionTitle: {
    fontSize: 18,
    fontWeight: "800",
    color: "#1B2B2B",
    textAlign: "center",
    marginBottom: 8,
  },
  selectedActionDescription: {
    fontSize: 15,
    color: "#486060",
    textAlign: "center",
    lineHeight: 22,
  },
  guideCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 18,
    padding: 16,
    marginTop: 18,
    borderWidth: 1,
    borderColor: "#E0E7E2",
  },
  guideCardTitle: {
    fontSize: 16,
    fontWeight: "800",
    color: "#1B2B2B",
    marginBottom: 14,
  },
  guideStepRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    marginBottom: 14,
  },
  guideStepNumber: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: "#6E9C83",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 12,
    marginTop: 2,
  },
  guideStepNumberText: {
    color: "#FFFFFF",
    fontWeight: "800",
    fontSize: 13,
  },
  guideStepText: {
    flex: 1,
    fontSize: 15,
    lineHeight: 22,
    color: "#486060",
  },
  summaryCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 18,
    padding: 16,
    marginTop: 18,
    borderWidth: 1,
    borderColor: "#E0E7E2",
  },
  summaryTitle: {
    fontSize: 16,
    fontWeight: "800",
    color: "#1B2B2B",
    marginBottom: 10,
  },
  summaryRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingVertical: 6,
  },
  summaryLabel: {
    fontSize: 15,
    color: "#476161",
  },
  summaryValue: {
    fontSize: 15,
    fontWeight: "800",
    color: "#1B2B2B",
  },
  successBanner: {
    position: "absolute",
    top: 10,
    left: 20,
    right: 20,
    zIndex: 20,
    backgroundColor: "#214A36",
    borderRadius: 14,
    paddingVertical: 12,
    alignItems: "center",
  },
  successBannerText: {
    color: "#FFFFFF",
    fontWeight: "800",
    fontSize: 15,
  },
  scoreCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 18,
    padding: 18,
    marginBottom: 18,
    borderWidth: 1,
    borderColor: "#E0E7E2",
  },
  scoreTitle: {
    fontSize: 17,
    fontWeight: "800",
    color: "#1B2B2B",
    textAlign: "center",
  },
  scoreValue: {
    fontSize: 44,
    fontWeight: "900",
    textAlign: "center",
    color: "#244040",
    marginTop: 8,
  },
  scoreLabel: {
    textAlign: "center",
    color: "#557070",
    fontWeight: "700",
    marginBottom: 14,
  },
  scoreStatsRow: {
    flexDirection: "row",
    gap: 10,
  },
  scoreStatBox: {
    flex: 1,
    backgroundColor: "#F4F7F5",
    borderRadius: 14,
    padding: 12,
    alignItems: "center",
  },
  scoreStatLabel: {
    fontSize: 12,
    color: "#607676",
    textAlign: "center",
    marginBottom: 6,
  },
  scoreStatValue: {
    fontSize: 16,
    fontWeight: "800",
    color: "#1B2B2B",
  },
  chartCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 18,
    padding: 18,
    marginBottom: 18,
    borderWidth: 1,
    borderColor: "#E0E7E2",
  },
  chartTitle: {
    fontSize: 17,
    fontWeight: "800",
    color: "#1B2B2B",
    marginBottom: 12,
  },
  insightRow: {
    flexDirection: "row",
    gap: 10,
    marginBottom: 14,
  },
  insightBox: {
    flex: 1,
    backgroundColor: "#F4F7F5",
    borderRadius: 14,
    padding: 12,
  },
  insightLabel: {
    fontSize: 12,
    color: "#607676",
    marginBottom: 6,
  },
  insightValue: {
    fontSize: 18,
    fontWeight: "800",
    color: "#1B2B2B",
  },
  insightText: {
    fontSize: 13,
    lineHeight: 18,
    color: "#486060",
  },
  chartEmptyText: {
    fontSize: 14,
    color: "#607676",
    textAlign: "center",
    paddingVertical: 20,
  },
  chartSubtext: {
    fontSize: 13,
    color: "#607676",
    marginBottom: 12,
  },
  trendChartBox: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-end",
    minHeight: 160,
    paddingTop: 8,
  },
  trendBarGroup: {
    flex: 1,
    alignItems: "center",
  },
  trendValue: {
    fontSize: 12,
    fontWeight: "700",
    color: "#284444",
    marginBottom: 4,
  },
  trendBarTrack: {
    width: 20,
    height: 120,
    backgroundColor: "#E8EEEA",
    borderRadius: 999,
    justifyContent: "flex-end",
    overflow: "hidden",
  },
  trendBarFill: {
    width: "100%",
    backgroundColor: "#6E9C83",
    borderRadius: 999,
  },
  trendBarLabel: {
    marginTop: 8,
    fontSize: 12,
    color: "#607676",
  },
  summaryCountRow: {
    flexDirection: "row",
    gap: 10,
    marginBottom: 18,
  },
  summaryCountCard: {
    flex: 1,
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    paddingVertical: 14,
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#E0E7E2",
  },
  summaryCountLabel: {
    fontSize: 13,
    color: "#607676",
    marginBottom: 4,
  },
  summaryCountValue: {
    fontSize: 20,
    fontWeight: "800",
    color: "#1B2B2B",
  },
  filterRow: {
    flexDirection: "row",
    gap: 10,
    marginBottom: 18,
  },
  filterButton: {
    flex: 1,
    backgroundColor: "#E9EFEB",
    borderRadius: 14,
    paddingVertical: 12,
    alignItems: "center",
  },
  activeFilterButton: {
    backgroundColor: "#6E9C83",
  },
  filterButtonText: {
    color: "#244040",
    fontWeight: "700",
  },
  activeFilterButtonText: {
    color: "#FFFFFF",
  },
  historyCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 18,
    padding: 16,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: "#E0E7E2",
  },
  historyMainContent: {
    flexDirection: "row",
    alignItems: "flex-start",
  },
  historyEmoji: {
    fontSize: 28,
    marginRight: 14,
    marginTop: 4,
  },
  historyTextBlock: {
    flex: 1,
  },
  historyLabel: {
    fontSize: 17,
    fontWeight: "800",
    color: "#1B2B2B",
    marginBottom: 8,
  },
  badgeRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    marginBottom: 8,
  },
  completedBadge: {
    backgroundColor: "#DFF1E6",
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  skippedBadge: {
    backgroundColor: "#F6E3DD",
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  followThroughBadge: {
    backgroundColor: "#DCEAF9",
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  notYetBadge: {
    backgroundColor: "#EEE7F8",
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  badgeText: {
    fontSize: 12,
    fontWeight: "700",
    color: "#284444",
  },
  historyNotes: {
    fontSize: 14,
    color: "#486060",
    lineHeight: 20,
    marginBottom: 8,
  },
  historySupportiveMessage: {
    fontSize: 13,
    color: "#607676",
    lineHeight: 19,
    marginBottom: 8,
    fontStyle: "italic",
  },
  historyActionCard: {
    backgroundColor: "#F4F7F5",
    borderRadius: 14,
    padding: 12,
    marginBottom: 8,
  },
  historyActionTitle: {
    fontSize: 13,
    fontWeight: "800",
    color: "#607676",
    marginBottom: 4,
  },
  historyActionText: {
    fontSize: 15,
    fontWeight: "800",
    color: "#1B2B2B",
    marginBottom: 4,
  },
  historyActionSubtext: {
    fontSize: 13,
    color: "#486060",
    lineHeight: 18,
  },
  historyTimestamp: {
    fontSize: 12,
    color: "#7A8A8A",
    marginTop: 4,
  },
  deleteButton: {
    backgroundColor: "#A54E42",
    borderRadius: 12,
    paddingVertical: 10,
    alignItems: "center",
    marginTop: 14,
  },
  deleteButtonText: {
    color: "#FFFFFF",
    fontWeight: "800",
    fontSize: 14,
  },
  clearButton: {
    backgroundColor: "#A54E42",
    marginTop: 12,
    marginBottom: 20,
  },
});