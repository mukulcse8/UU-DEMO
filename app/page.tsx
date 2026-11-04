
"use client";

import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabase";
import ExpansionHub from "@/app/components/ExpansionHub";
import { BN_TO_EN, EN_TO_BN } from "@/lib/i18n";
import {
  BookOpen, GraduationCap, Heart, ImagePlus, LogIn, MessageCircle, Search,
  ShieldCheck, Users, Bell, Plus, LogOut, Send, Upload, ClipboardCheck,
  CheckCircle2, XCircle, Clock, FileText, RefreshCw, UserRound, UsersRound,
  SendHorizontal, MessageSquare, Share2, MoreHorizontal, UserPlus, SearchCheck,
  Camera, Pencil, ThumbsUp, Image, Menu, X, Hash, PlusCircle, Settings, Sun, Moon, Languages
} from "lucide-react";

type University = {
  id: string;
  name: string;
  short_name: string;
  domain: string | null;
};

type Post = {
  id: string;
  content: string;
  created_at: string;
  author_id: string;
  university_id: string;
};

type FeedComment = {
  id: string;
  post_id: string;
  author_id: string;
  content: string;
  created_at: string;
  author_name?: string;
};

type Profile = {
  id: string;
  full_name: string;
  university_id: string | null;
  student_status: string;
  role: string;
  avatar_url?: string | null;
  department?: string | null;
  batch?: string | null;
};

type SocialGroup = {
  id: string;
  name: string;
  description: string | null;
  university_id: string;
  created_by: string;
  created_at: string;
  member_count?: number;
};

type GroupMessage = {
  id: string;
  group_id: string;
  sender_id: string;
  content: string;
  created_at: string;
  profiles?: { full_name: string } | null;
};

type DirectMessage = {
  id: string;
  conversation_id: string;
  sender_id: string;
  content: string;
  created_at: string;
};

type Verification = {
  id: string;
  user_id: string;
  storage_path: string;
  document_type: string;
  status: string;
  created_at: string;
  student?: {
    id?: string;
    full_name: string;
    university_id: string | null;
  } | null;
};

type EvidenceType = "image" | "pdf" | "email" | "unknown";

const demoUniversities: University[] = [
  {
    id: "demo-du",
    name: "ঢাকা বিশ্ববিদ্যালয়",
    short_name: "ঢাবি",
    domain: "du.ac.bd"
  },
  {
    id: "demo-buet",
    name: "বাংলাদেশ প্রকৌশল বিশ্ববিদ্যালয়",
    short_name: "বুয়েট",
    domain: "buet.ac.bd"
  },
  {
    id: "demo-ju",
    name: "জাহাঙ্গীরনগর বিশ্ববিদ্যালয়",
    short_name: "জাবি",
    domain: "juniv.edu"
  },
  {
    id: "demo-ru",
    name: "রাজশাহী বিশ্ববিদ্যালয়",
    short_name: "রাবি",
    domain: "ru.ac.bd"
  },
  {
    id: "demo-cu",
    name: "চট্টগ্রাম বিশ্ববিদ্যালয়",
    short_name: "চবি",
    domain: "cu.ac.bd"
  },
  {
    id: "demo-nsu",
    name: "নর্থ সাউথ বিশ্ববিদ্যালয়",
    short_name: "NSU",
    domain: "northsouth.edu"
  }
];

const statusText: Record<string, string> = {
  pending: "যাচাইয়ের অপেক্ষায়",
  email_verified: "ইমেইল যাচাই হয়েছে; অনুমোদন বাকি",
  document_submitted: "পরিচয়পত্র জমা হয়েছে; পর্যালোচনা বাকি",
  verified: "যাচাইকৃত শিক্ষার্থী",
  rejected: "আবেদন বাতিল হয়েছে"
};

export default function Home() {
  const [tab, setTab] = useState("feed");
  const [language, setLanguage] = useState<"en" | "bn">("en");
  const [theme, setTheme] = useState<"light" | "dark" | "system">("light");
  const [universities, setUniversities] = useState<University[]>(demoUniversities);
  const [posts, setPosts] = useState<Post[]>([]);
  const [content, setContent] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [authMode, setAuthMode] = useState<"login" | "signup">("login");
  const [phone, setPhone] = useState("");
  const [authReady, setAuthReady] = useState(false);
  const [fullName, setFullName] = useState("");
  const [selectedUni, setSelectedUni] = useState("");
  const [user, setUser] = useState<any>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [notice, setNotice] = useState("");
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState("");
  const [docFile, setDocFile] = useState<File | null>(null);
  const [docType, setDocType] = useState("student_id");
  const [applications, setApplications] = useState<Verification[]>([]);
  const [reviewBusy, setReviewBusy] = useState("");

  // প্রমাণ দেখানোর উইন্ডোর state
  const [evidenceOpen, setEvidenceOpen] = useState(false);
  const [evidenceLoading, setEvidenceLoading] = useState(false);
  const [evidenceUrl, setEvidenceUrl] = useState("");
  const [evidenceType, setEvidenceType] = useState<EvidenceType>("unknown");
  const [evidenceName, setEvidenceName] = useState("");
  const [evidenceText, setEvidenceText] = useState("");

  const [profileEditing, setProfileEditing] = useState(false);
  const [editName, setEditName] = useState("");
  const [editDepartment, setEditDepartment] = useState("");
  const [editBatch, setEditBatch] = useState("");
  const [editUniversity, setEditUniversity] = useState("");

  const [groups, setGroups] = useState<SocialGroup[]>([]);
  const [activeGroup, setActiveGroup] = useState<SocialGroup | null>(null);
  const [groupName, setGroupName] = useState("");
  const [groupDescription, setGroupDescription] = useState("");
  const [groupDraft, setGroupDraft] = useState("");
  const [groupMessages, setGroupMessages] = useState<GroupMessage[]>([]);
  const [people, setPeople] = useState<Profile[]>([]);
  const [activePerson, setActivePerson] = useState<Profile | null>(null);
  const [activeConversationId, setActiveConversationId] = useState<string | null>(null);
  const [dmDraft, setDmDraft] = useState("");
  const [dmMessages, setDmMessages] = useState<DirectMessage[]>([]);
  const [commentDrafts, setCommentDrafts] = useState<Record<string, string>>({});
  const [openComments, setOpenComments] = useState<string | null>(null);
  const [likedPosts, setLikedPosts] = useState<string[]>([]);
  const [likeCounts, setLikeCounts] = useState<Record<string, number>>({});
  const [commentCounts, setCommentCounts] = useState<Record<string, number>>({});
  const [postAuthors, setPostAuthors] = useState<Record<string, Profile>>({});
  const [postComments, setPostComments] = useState<Record<string, FeedComment[]>>({});
  const [commentsLoading, setCommentsLoading] = useState<string | null>(null);
  const [mobileNav, setMobileNav] = useState(false);

  // Persist language and appearance preferences locally for this browser.
  useEffect(() => {
    try {
      const savedLanguage = localStorage.getItem("cc-language");
      const savedTheme = localStorage.getItem("cc-theme");
      if (savedLanguage === "bn" || savedLanguage === "en") setLanguage(savedLanguage);
      if (savedTheme === "light" || savedTheme === "dark" || savedTheme === "system") setTheme(savedTheme);
    } catch { /* local storage may be unavailable */ }
  }, []);

  // Translate exact UI labels only. User-generated content and names are not translated.
  useEffect(() => {
    try { localStorage.setItem("cc-language", language); } catch { /* ignore */ }
    document.documentElement.lang = language;
    const translate = (root: ParentNode) => {
      const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
      let node: Node | null;
      while ((node = walker.nextNode())) {
        const original = node.nodeValue || "";
        const trimmed = original.trim();
        if (!trimmed) continue;
        const dictionary = language === "en" ? BN_TO_EN : EN_TO_BN;
        let translated = dictionary[trimmed];
        if (!translated) {
          const prefix = Object.keys(dictionary).filter(key => key.endsWith(" ") && trimmed.startsWith(key)).sort((a, b) => b.length - a.length)[0];
          if (prefix) translated = dictionary[prefix] + trimmed.slice(prefix.length);
        }
        if (translated) node.nodeValue = original.replace(trimmed, translated);
      }
      const translateAttributes = (el: Element) => {
        ["placeholder", "title", "aria-label"].forEach(attr => {
          const value = el.getAttribute(attr);
          if (!value) return;
          const translated = language === "en" ? BN_TO_EN[value] : EN_TO_BN[value];
          if (translated) el.setAttribute(attr, translated);
        });
      };
      if (root instanceof Element) translateAttributes(root);
      if (typeof (root as ParentNode).querySelectorAll === "function") (root as ParentNode).querySelectorAll("[placeholder], [title], [aria-label]").forEach(translateAttributes);
    };
    translate(document.body);
    const observer = new MutationObserver(records => records.forEach(record => {
      if (record.type === "characterData" && record.target.parentNode) translate(record.target.parentNode);
      record.addedNodes.forEach(node => { if (node instanceof Element) translate(node); });
    }));
    observer.observe(document.body, { childList: true, subtree: true, characterData: true });
    return () => observer.disconnect();
  }, [language]);

  useEffect(() => {
    try { localStorage.setItem("cc-theme", theme); } catch { /* ignore */ }
    const media = window.matchMedia("(prefers-color-scheme: dark)");
    const applyTheme = () => {
      const isDark = theme === "dark" || (theme === "system" && media.matches);
      document.documentElement.dataset.theme = isDark ? "dark" : "light";
      document.documentElement.style.colorScheme = isDark ? "dark" : "light";
    };
    applyTheme();
    if (theme === "system") media.addEventListener("change", applyTheme);
    return () => media.removeEventListener("change", applyTheme);
  }, [theme]);

  const realUniversities = useMemo(
    () => universities.filter(u => !u.id.startsWith("demo-")),
    [universities]
  );

  async function loadFeed() {
    if (!supabase || !user) return;

    if (!profile?.university_id) {
      setPosts([]);
      return;
    }

    const { data, error } = await supabase
      .from("posts")
      .select("id,content,created_at,author_id,university_id")
      .eq("visibility", "university")
      .eq("university_id", profile.university_id)
      .order("created_at", { ascending: false })
      .limit(40);

    if (error) {
      setNotice("নিউজ ফিড আনা যায়নি: " + error.message);
      return;
    }

    const rows = (data || []) as Post[];
    setPosts(rows);

    const ids = rows.map(row => row.id);

    if (!ids.length) {
      setPostAuthors({});
      setLikeCounts({});
      setCommentCounts({});
      setLikedPosts([]);
      return;
    }

    const authorIds = Array.from(new Set(rows.map(row => row.author_id)));

    const [authorResult, likeResult, commentResult] = await Promise.all([
      supabase
        .from("profiles")
        .select("id,full_name,university_id,student_status,role,avatar_url")
        .in("id", authorIds),

      supabase
        .from("post_likes")
        .select("post_id,user_id")
        .in("post_id", ids),

      supabase
        .from("comments")
        .select("post_id")
        .in("post_id", ids)
    ]);

    if (authorResult.data) {
      setPostAuthors(
        Object.fromEntries(
          (authorResult.data as Profile[]).map(author => [author.id, author])
        )
      );
    }

    if (likeResult.data) {
      const counts: Record<string, number> = {};

      likeResult.data.forEach((like: any) => {
        counts[like.post_id] = (counts[like.post_id] || 0) + 1;
      });

      setLikeCounts(counts);

      setLikedPosts(
        likeResult.data
          .filter((like: any) => like.user_id === user.id)
          .map((like: any) => like.post_id)
      );
    }

    if (commentResult.data) {
      const counts: Record<string, number> = {};

      commentResult.data.forEach((comment: any) => {
        counts[comment.post_id] = (counts[comment.post_id] || 0) + 1;
      });

      setCommentCounts(counts);
    }
  }

  async function loadComments(postId: string) {
    if (!supabase) return;

    setCommentsLoading(postId);

    const { data, error } = await supabase
      .from("comments")
      .select("id,post_id,author_id,content,created_at")
      .eq("post_id", postId)
      .order("created_at", { ascending: true })
      .limit(100);

    if (error) {
      setNotice("মন্তব্য আনা যায়নি: " + error.message);
    } else {
      const rows = (data || []) as FeedComment[];
      const ids = Array.from(new Set(rows.map(row => row.author_id)));

      const { data: peopleData } = ids.length
        ? await supabase
            .from("profiles")
            .select("id,full_name")
            .in("id", ids)
        : { data: [] as any[] };

      const names = Object.fromEntries(
        (peopleData || []).map((person: any) => [
          person.id,
          person.full_name
        ])
      );

      setPostComments(old => ({
        ...old,
        [postId]: rows.map(row => ({
          ...row,
          author_name: names[row.author_id] || "CampusConnect শিক্ষার্থী"
        }))
      }));
    }

    setCommentsLoading(null);
  }

  async function loadProfile(currentUser: any) {
    if (!supabase || !currentUser) {
      setProfile(null);
      return;
    }

    const { data, error } = await supabase
      .from("profiles")
      .select("id,full_name,university_id,student_status,role,department,batch")
      .eq("id", currentUser.id)
      .maybeSingle();

    if (error) {
      setNotice("প্রোফাইল লোড করা যায়নি: " + error.message);
      return;
    }

    setProfile(data as Profile | null);
  }

  async function loadApplications() {
    if (!supabase) return;

    const { data, error } = await supabase
      .from("verification_documents")
      .select(`
        id,
        user_id,
        storage_path,
        document_type,
        status,
        created_at,
        student:profiles!verification_documents_user_id_fkey (
          id,
          full_name,
          university_id
        )
      `)
      .eq("status", "pending")
      .order("created_at", { ascending: true });

    if (error) {
      setNotice("আবেদন তালিকা আনা যায়নি: " + error.message);
      setApplications([]);
      return;
    }

    setApplications((data || []) as unknown as Verification[]);
    setNotice("");
  }

  async function loadGroups() {
    if (!supabase || !user || profile?.student_status !== "verified" || !profile.university_id) return;

    const { data, error } = await supabase
      .from("social_groups")
      .select("id,name,description,university_id,created_by,created_at")
      .eq("university_id", profile.university_id)
      .order("created_at", { ascending: false });

    if (error) {
      setNotice("গ্রুপ আনা যায়নি: " + error.message);
      return;
    }

    setGroups((data || []) as SocialGroup[]);
  }

  async function loadPeople() {
    if (!supabase || !profile?.university_id || profile.student_status !== "verified") return;

    const { data, error } = await supabase
      .from("profiles")
      .select("id,full_name,university_id,student_status,role")
      .eq("university_id", profile.university_id)
      .eq("student_status", "verified")
      .neq("id", user?.id || "")
      .order("full_name")
      .limit(80);

    if (!error) setPeople((data || []) as Profile[]);
  }

  async function joinGroup(group: SocialGroup) {
    if (!supabase || !user) return;

    const { error } = await supabase
      .from("social_group_members")
      .insert({ group_id: group.id, user_id: user.id });

    if (error && !error.message.toLowerCase().includes("duplicate")) {
      setNotice("গ্রুপে যোগ দেওয়া যায়নি: " + error.message);
    } else {
      setNotice("গ্রুপে যোগ দিয়েছ।");
      await openGroup(group);
    }
  }

  async function openGroup(group: SocialGroup) {
    setActiveGroup(group);

    if (!supabase) return;

    const { data, error } = await supabase
      .from("group_messages")
      .select("id,group_id,sender_id,content,created_at")
      .eq("group_id", group.id)
      .order("created_at")
      .limit(100);

    if (error) {
      setNotice("মেসেজ আনা যায়নি: " + error.message);
    } else {
      setGroupMessages((data || []) as GroupMessage[]);
    }
  }

  async function createGroup() {
    if (!supabase || !user || profile?.student_status !== "verified" || !profile.university_id) return;
    if (!groupName.trim()) return setNotice("গ্রুপের নাম লিখুন।");

    setLoading(true);

    const { data, error } = await supabase
      .from("social_groups")
      .insert({
        name: groupName.trim(),
        description: groupDescription.trim(),
        university_id: profile.university_id,
        created_by: user.id
      })
      .select()
      .single();

    if (error) {
      setNotice("গ্রুপ তৈরি হয়নি: " + error.message);
    } else {
      const membership = await supabase
        .from("social_group_members")
        .insert({ group_id: data.id, user_id: user.id });

      if (membership.error) {
        setNotice("গ্রুপ তৈরি হয়েছে, তবে সদস্যপদ যোগ হয়নি: " + membership.error.message);
      } else {
        setNotice("নতুন গ্রুপ তৈরি হয়েছে।");
      }

      setGroupName("");
      setGroupDescription("");
      await loadGroups();

      if (!membership.error) {
        await openGroup(data as SocialGroup);
      }
    }

    setLoading(false);
  }

  async function sendGroupMessage() {
    if (!supabase || !user || !activeGroup || !groupDraft.trim()) return;

    const { data, error } = await supabase
      .from("group_messages")
      .insert({
        group_id: activeGroup.id,
        sender_id: user.id,
        content: groupDraft.trim()
      })
      .select()
      .single();

    if (error) {
      setNotice("মেসেজ পাঠানো যায়নি: " + error.message);
    } else {
      setGroupDraft("");
      setGroupMessages(old => old.some(m => m.id === data.id) ? old : [...old, data as GroupMessage]);
    }
  }

  async function saveProfile() {
    if (!supabase || !user) {
      setNotice("প্রথমে লগইন করুন।");
      return;
    }

    if (!editName.trim()) {
      setNotice("তোমার পূর্ণ নাম লিখুন।");
      return;
    }

    if (!editUniversity) {
      setNotice("একটি বিশ্ববিদ্যালয় নির্বাচন করুন।");
      return;
    }

    const selectedUniversity = realUniversities.find(
      university => university.id === editUniversity
    );

    if (!selectedUniversity) {
      setNotice("সঠিক বিশ্ববিদ্যালয় নির্বাচন করুন। তালিকা থেকে আবার নির্বাচন করুন।");
      return;
    }

    setLoading(true);

    const { error } = await supabase
      .from("profiles")
      .update({
        full_name: editName.trim(),
        university_id: editUniversity,
        department: editDepartment.trim() || null,
        batch: editBatch.trim() || null
      })
      .eq("id", user.id);

    if (error) {
      setNotice("প্রোফাইল আপডেট হয়নি: " + error.message);
    } else {
      setNotice("প্রোফাইল ও বিশ্ববিদ্যালয়ের তথ্য সফলভাবে আপডেট হয়েছে।");
      setProfileEditing(false);
      await loadProfile(user);
    }

    setLoading(false);
  }

  async function toggleLike(postId: string) {
    if (!supabase || !user) return setNotice("লাইক দিতে লগইন করুন।");

    const liked = likedPosts.includes(postId);

    const result = liked
      ? await supabase.from("post_likes").delete().eq("post_id", postId).eq("user_id", user.id)
      : await supabase.from("post_likes").insert({ post_id: postId, user_id: user.id });

    if (result.error) {
      setNotice("লাইক আপডেট হয়নি: " + result.error.message);
    } else {
      setLikedPosts(old => liked ? old.filter(x => x !== postId) : [...old, postId]);

      setLikeCounts(old => ({
        ...old,
        [postId]: Math.max(0, (old[postId] || 0) + (liked ? -1 : 1))
      }));
    }
  }

  async function addComment(postId: string) {
    if (!supabase || !user) return setNotice("মন্তব্য করতে লগইন করুন।");

    const text = commentDrafts[postId]?.trim();
    if (!text) return;

    const { error } = await supabase
      .from("comments")
      .insert({
        post_id: postId,
        author_id: user.id,
        content: text
      });

    if (error) {
      setNotice("মন্তব্য পাঠানো যায়নি: " + error.message);
    } else {
      setCommentDrafts(old => ({ ...old, [postId]: "" }));
      setCommentCounts(old => ({ ...old, [postId]: (old[postId] || 0) + 1 }));
      setNotice("মন্তব্য প্রকাশিত হয়েছে।");

      if (openComments === postId) {
        await loadComments(postId);
      }
    }
  }

  async function startDirectMessage(person: Profile) {
    setActivePerson(person);
    setDmMessages([]);
    setActiveConversationId(null);

    if (!supabase || !user) return;

    const memberIds = [user.id, person.id].sort();

    const { data: existing } = await supabase
      .from("direct_conversations")
      .select("id")
      .contains("member_ids", memberIds)
      .limit(1)
      .maybeSingle();

    let conversationId = existing?.id;

    if (!conversationId) {
      const { data: conv, error } = await supabase
        .from("direct_conversations")
        .insert({ created_by: user.id, member_ids: memberIds })
        .select()
        .single();

      if (error) {
        setNotice("চ্যাট শুরু করা যায়নি: " + error.message);
        return;
      }

      conversationId = conv.id;
    }

    setActiveConversationId(conversationId);

    const { data, error } = await supabase
      .from("direct_messages")
      .select("id,conversation_id,sender_id,content,created_at")
      .eq("conversation_id", conversationId)
      .order("created_at")
      .limit(100);

    if (!error) setDmMessages((data || []) as DirectMessage[]);
  }

  async function sendDirectMessage() {
    if (!supabase || !user || !activePerson || !dmDraft.trim()) return;

    if (!activeConversationId) {
      return setNotice("প্রথমে নতুন কথোপকথন শুরু করুন।");
    }

    const { data, error } = await supabase
      .from("direct_messages")
      .insert({
        conversation_id: activeConversationId,
        sender_id: user.id,
        content: dmDraft.trim()
      })
      .select()
      .single();

    if (error) {
      setNotice("মেসেজ পাঠানো যায়নি: " + error.message);
    } else {
      setDmDraft("");
      setDmMessages(old => old.some(m => m.id === data.id) ? old : [...old, data as DirectMessage]);
    }
  }

  async function sharePost(postId: string, body: string) {
    const url = `${window.location.origin}/?post=${postId}`;

    if (supabase && user) {
      const { error } = await supabase
        .from("post_shares")
        .insert({ post_id: postId, user_id: user.id });

      if (error) {
        setNotice("শেয়ার লিংক তৈরি হয়েছে; শেয়ার গণনা সংরক্ষণ হয়নি: " + error.message);
      }
    }

    try {
      if (navigator.share) {
        await navigator.share({
          title: "CampusConnect পোস্ট",
          text: body,
          url
        });
      } else {
        await navigator.clipboard.writeText(url);
        setNotice("পোস্টের লিংক কপি হয়েছে। এখন বন্ধুদের পাঠাতে পারো।");
      }
    } catch {
      try {
        await navigator.clipboard.writeText(url);
        setNotice("পোস্টের লিংক কপি হয়েছে।");
      } catch {
        setNotice("পোস্টের লিংক: " + url);
      }
    }
  }

  useEffect(() => {
    if (!supabase) {
      setNotice("Supabase is not configured. Add NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY in Vercel → Project → Settings → Environment Variables, then redeploy.");
      setAuthReady(true);
      return;
    }

    let mounted = true;
    let startupTimer: ReturnType<typeof setTimeout> | undefined;

    // Never leave the entire app trapped behind the startup spinner if the
    // Supabase network request or browser auth lock does not resolve.
    startupTimer = setTimeout(() => {
      if (!mounted) return;
      setAuthReady(true);
      setNotice(current => current || "Connection is taking longer than expected. Check the Supabase URL/key and project status, then refresh the page.");
    }, 12000);

    const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!mounted) return;
      const nextUser = session?.user ?? null;
      setUser(nextUser);
      setAuthReady(true);
      if (startupTimer) clearTimeout(startupTimer);

      if (nextUser) {
        // Do not block initial rendering on the profile query.
        setTimeout(() => {
          if (!mounted) return;
          void loadProfile(nextUser).catch((error: any) => {
            if (mounted) setNotice("Profile could not be loaded: " + (error?.message || "Please refresh."));
          });
        }, 0);
      } else {
        setProfile(null);
        setPosts([]);
      }
    });

    void supabase.auth.getSession()
      .then(({ data, error }) => {
        if (!mounted) return;
        if (error) setNotice("Authentication check failed: " + error.message);
        const currentUser = data.session?.user ?? null;
        setUser(currentUser);
        setAuthReady(true);
        if (startupTimer) clearTimeout(startupTimer);
        if (currentUser) {
          void loadProfile(currentUser).catch((loadError: any) => {
            if (mounted) setNotice("Profile could not be loaded: " + (loadError?.message || "Please refresh."));
          });
        }
      })
      .catch((error: any) => {
        if (!mounted) return;
        setNotice("Could not connect to Supabase: " + (error?.message || "Check your Vercel environment variables and Supabase project."));
        setAuthReady(true);
        if (startupTimer) clearTimeout(startupTimer);
      });

    void supabase
      .from("universities")
      .select("id,name,short_name,domain")
      .eq("is_active", true)
      .order("name")
      .then(
        ({ data, error }) => {
          if (!mounted) return;
          if (error) {
            setNotice(current => current || "University list could not be loaded: " + error.message);
            return;
          }
          if (data?.length) setUniversities(data as University[]);
          else {
            setUniversities([]);
            setNotice(current => current || "No active universities found. Ask an administrator to add universities.");
          }
        },
        (error: any) => {
          if (mounted) {
            setNotice(current => current || "University list request failed: " + (error?.message || "Please refresh."));
          }
        }
      );

    return () => {
      mounted = false;
      if (startupTimer) clearTimeout(startupTimer);
      listener.subscription.unsubscribe();
    };
  }, []);

  useEffect(() => {
    if (!supabase || !user || !profile?.university_id) {
      setPosts([]);
      return;
    }

    void loadFeed();

    const channel = supabase
      .channel("campus-feed-" + profile.university_id)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "posts",
          filter: `university_id=eq.${profile.university_id}`
        },
        () => {
          void loadFeed();
        }
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "post_likes" },
        () => {
          void loadFeed();
        }
      )
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "comments" },
        () => {
          void loadFeed();
        }
      )
      .subscribe();

    return () => {
      void supabase?.removeChannel(channel);
    };
  }, [user?.id, profile?.university_id]);

  useEffect(() => {
    if (!supabase || !activeGroup?.id) return;

    const channel = supabase
      .channel("group-chat-" + activeGroup.id)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "group_messages",
          filter: `group_id=eq.${activeGroup.id}`
        },
        payload => {
          const msg = payload.new as GroupMessage;
          setGroupMessages(old => old.some(m => m.id === msg.id) ? old : [...old, msg]);
        }
      )
      .subscribe();

    return () => {
      void supabase?.removeChannel(channel);
    };
  }, [activeGroup?.id]);

  useEffect(() => {
    if (!supabase || !activeConversationId) return;

    const channel = supabase
      .channel("direct-chat-" + activeConversationId)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "direct_messages",
          filter: `conversation_id=eq.${activeConversationId}`
        },
        payload => {
          const msg = payload.new as DirectMessage;
          setDmMessages(old => old.some(m => m.id === msg.id) ? old : [...old, msg]);
        }
      )
      .subscribe();

    return () => {
      void supabase?.removeChannel(channel);
    };
  }, [activeConversationId]);

  useEffect(() => {
    if (profile && ["super_admin", "university_admin", "moderator"].includes(profile.role) && tab === "admin") {
      void loadApplications();
    }

    if (profile?.student_status === "verified" && tab === "groups") {
      void loadGroups();
    }

    if (profile?.student_status === "verified" && (tab === "messages" || tab === "people")) {
      void loadPeople();
    }
  }, [profile, tab]);

  const visibleUniversities = useMemo(
    () => universities.filter(u =>
      (u.name + " " + u.short_name).toLowerCase().includes(search.toLowerCase())
    ),
    [universities, search]
  );

  const visiblePosts = useMemo(
    () => posts.filter(post => {
      const author = postAuthors[post.author_id]?.full_name || "";
      const haystack = `${post.content} ${author}`.toLowerCase();
      return haystack.includes(search.trim().toLowerCase());
    }),
    [posts, postAuthors, search]
  );

  async function signIn() {
    if (!supabase) return setNotice("ডেটাবেজ সংযোগ পাওয়া যাচ্ছে না।");

    const cleanEmail = email.trim().toLowerCase();

    if (!cleanEmail || !password) {
      return setNotice("ইমেইল ও পাসওয়ার্ড লিখুন।");
    }

    setLoading(true);

    try {
      const { error } = await supabase.auth.signInWithPassword({
        email: cleanEmail,
        password
      });

      if (error) {
        setNotice("লগইন করা যায়নি: " + error.message);
      } else {
        setNotice("লগইন সফল।");
      }
    } catch (err: any) {
      setNotice("লগইনে সমস্যা হয়েছে: " + (err?.message || "আবার চেষ্টা করুন।"));
    } finally {
      setLoading(false);
    }
  }

  async function signUp() {
    if (!supabase) return setNotice("ডেটাবেজ সংযোগ পাওয়া যাচ্ছে না।");

    if (!selectedUni || !fullName.trim() || !phone.trim() || !email.trim()) {
      return setNotice("নাম, বিশ্ববিদ্যালয়, ইমেইল ও ফোন নম্বর পূরণ করুন।");
    }

    if (!realUniversities.some(u => u.id === selectedUni)) {
      return setNotice("তালিকা থেকে একটি সঠিক বিশ্ববিদ্যালয় নির্বাচন করুন।");
    }

    if (!/^\+?[0-9\s-]{10,15}$/.test(phone.trim())) {
      return setNotice("সঠিক ফোন নম্বর লিখুন।");
    }

    if (password.length < 8) {
      return setNotice("পাসওয়ার্ড কমপক্ষে ৮ অক্ষরের হতে হবে।");
    }

    setLoading(true);

    try {
      const { error } = await supabase.auth.signUp({
        email: email.trim().toLowerCase(),
        password,
        options: {
          data: {
            full_name: fullName.trim(),
            university_id: selectedUni,
            phone_number: phone.trim()
          },
          emailRedirectTo: `${window.location.origin}/`
        }
      });

      setNotice(
        error
          ? "সাইন আপ করা যায়নি: " + error.message
          : "অ্যাকাউন্ট তৈরি হয়েছে। ইমেইল যাচাই করে লগইন করুন; এরপর স্টুডেন্ট আইডি কার্ড জমা দিতে পারবে।"
      );

      if (!error) setAuthMode("login");
    } catch (err: any) {
      setNotice("সাইন আপে সমস্যা হয়েছে: " + (err?.message || "আবার চেষ্টা করুন।"));
    } finally {
      setLoading(false);
    }
  }

  async function submitDocument() {
    if (!supabase || !user || !profile) {
      return setNotice("প্রথমে লগইন করুন।");
    }

    if (!docFile) {
      return setNotice("প্রথমে পরিচয়পত্রের ছবি বা PDF নির্বাচন করুন।");
    }

    if (!["image/jpeg", "image/png", "application/pdf"].includes(docFile.type)) {
      return setNotice("শুধু JPG, PNG অথবা PDF ফাইল গ্রহণ করা হবে।");
    }

    if (docFile.size > 5 * 1024 * 1024) {
      return setNotice("ফাইল সর্বোচ্চ ৫ MB হতে পারবে।");
    }

    if (profile.student_status === "verified") {
      return setNotice("তোমার অ্যাকাউন্ট ইতিমধ্যে যাচাইকৃত।");
    }

    setLoading(true);

    const safeName = docFile.name.replace(/[^a-zA-Z0-9._-]/g, "_");
    const path = `${user.id}/${Date.now()}-${safeName}`;

    const upload = await supabase.storage
      .from("verification-documents")
      .upload(path, docFile, {
        upsert: false,
        contentType: docFile.type
      });

    if (upload.error) {
      setNotice("ফাইল আপলোড হয়নি: " + upload.error.message);
      setLoading(false);
      return;
    }

    const { error } = await supabase
      .from("verification_documents")
      .insert({
        user_id: user.id,
        storage_path: path,
        document_type: docType,
        status: "pending"
      });

    if (error) {
      await supabase.storage.from("verification-documents").remove([path]);
      setNotice("আবেদন জমা হয়নি: " + error.message);
    } else {
      setNotice("পরিচয়পত্র নিরাপদে জমা হয়েছে। প্রশাসকের পর্যালোচনার অপেক্ষায় থাকো।");
      setDocFile(null);
      await loadProfile(user);
    }

    setLoading(false);
  }

  async function submitUniversityEmailProof() {
    if (!supabase || !user || !profile) {
      return setNotice("প্রথমে লগইন করুন।");
    }

    const uni = universities.find(u => u.id === profile.university_id);
    const domain = uni?.domain?.toLowerCase().trim();
    const userDomain = String(user.email || "").split("@")[1]?.toLowerCase();

    if (!domain || !userDomain || !(userDomain === domain || userDomain.endsWith("." + domain))) {
      return setNotice(
        `এই বিশ্ববিদ্যালয়ের নির্ধারিত ইমেইল ডোমেইন ${domain || "সেট করা নেই"}। তোমার অ্যাকাউন্টের ইমেইল ডোমেইন মেলেনি; পরিচয়পত্র জমা দাও।`
      );
    }

    if (!user.email_confirmed_at) {
      return setNotice("প্রথমে ইমেইল কনফার্মেশন সম্পন্ন করো।");
    }

    setLoading(true);

    const { error } = await supabase
      .from("verification_documents")
      .insert({
        user_id: user.id,
        storage_path: `email-confirmed:${user.email}`,
        document_type: "other",
        status: "pending"
      });

    setNotice(
      error
        ? error.message
        : "বিশ্ববিদ্যালয়ের ইমেইল প্রমাণ জমা হয়েছে। প্রশাসকের অনুমোদনের অপেক্ষায় থাকো।"
    );

    setLoading(false);
  }

  async function reviewApplication(id: string, decision: "approved" | "rejected") {
    if (!supabase) return;

    setReviewBusy(id);

    const { error } = await supabase.rpc("review_student_verification", {
      p_document_id: id,
      p_decision: decision
    });

    setNotice(
      error
        ? "পর্যালোচনা ব্যর্থ: " + error.message
        : decision === "approved"
          ? "শিক্ষার্থী অনুমোদিত হয়েছে।"
          : "আবেদন বাতিল করা হয়েছে।"
    );

    if (!error) await loadApplications();

    setReviewBusy("");
  }

  // প্রমাণ দেখানোর উইন্ডো বন্ধ
  function closeEvidence() {
    setEvidenceOpen(false);
    setEvidenceUrl("");
    setEvidenceText("");
    setEvidenceName("");
    setEvidenceType("unknown");
    setEvidenceLoading(false);
  }

  // ছবি, PDF অথবা ইমেইল প্রমাণ ওয়েবসাইটের মধ্যেই দেখানো
  async function openDocument(path: string, documentType?: string) {
    if (!supabase) {
      setNotice("ডেটাবেজ সংযোগ পাওয়া যাচ্ছে না।");
      return;
    }

    setEvidenceOpen(true);
    setEvidenceLoading(true);
    setEvidenceUrl("");
    setEvidenceText("");
    setEvidenceName(documentType || "জমা দেওয়া প্রমাণ");
    setEvidenceType("unknown");

    // ইমেইল যাচাইয়ের আবেদন হলে Storage ফাইল নেই
    if (path.startsWith("email-confirmed:")) {
      const submittedEmail = path.replace("email-confirmed:", "");

      setEvidenceType("email");
      setEvidenceText(submittedEmail);
      setEvidenceName("বিশ্ববিদ্যালয়ের ইমেইল যাচাই");
      setEvidenceLoading(false);
      return;
    }

    const extension = path.split(".").pop()?.toLowerCase() || "";

    let detectedType: EvidenceType = "unknown";

    if (["jpg", "jpeg", "png", "webp"].includes(extension)) {
      detectedType = "image";
    } else if (extension === "pdf") {
      detectedType = "pdf";
    }

    setEvidenceType(detectedType);

    const { data, error } = await supabase.storage
      .from("verification-documents")
      .createSignedUrl(path, 300);

    if (error || !data?.signedUrl) {
      setEvidenceLoading(false);
      setNotice(
        "প্রমাণ খোলা যায়নি: " +
        (error?.message || "নথির নিরাপদ লিংক তৈরি করা যায়নি।")
      );
      return;
    }

    setEvidenceUrl(data.signedUrl);
    setEvidenceLoading(false);

    if (detectedType === "unknown") {
      setNotice("এই ফাইলের ধরন সরাসরি দেখানো যাচ্ছে না। প্রয়োজনে ফাইলটি খুলে দেখুন।");
    }
  }

  async function createPost() {
    if (!supabase || !user) {
      return setNotice("পোস্ট করতে লগইন করুন।");
    }

    if (!profile?.university_id) {
      return setNotice("তোমার প্রোফাইলে বিশ্ববিদ্যালয় যুক্ত নেই। প্রোফাইল সম্পাদনা করে বিশ্ববিদ্যালয় নির্বাচন করো।");
    }

    if (!content.trim()) {
      return setNotice("পোস্টের লেখা লিখুন।");
    }

    setLoading(true);

    const { error } = await supabase
      .from("posts")
      .insert({
        content: content.trim(),
        author_id: user.id,
        university_id: profile.university_id,
        visibility: "university"
      });

    setNotice(error ? "পোস্ট প্রকাশ করা যায়নি: " + error.message : "পোস্ট প্রকাশিত হয়েছে।");

    if (!error) {
      setContent("");
      await loadFeed();
    }

    setLoading(false);
  }

  async function signOut() {
    closeEvidence();
    await supabase?.auth.signOut();
    setUser(null);
    setProfile(null);
    setAuthMode("login");
    setPosts([]);
  }

  if (!authReady) {
    return (
      <main className="auth-loading">
        <div className="auth-brand-mark"><GraduationCap size={30} /></div>
        <strong>CampusConnect</strong>
        <span>নিরাপদ ক্যাম্পাস কমিউনিটি লোড হচ্ছে...</span>
      </main>
    );
  }

  if (!user) {
    return (
      <main className="auth-page">
        <section className="auth-intro">
          <a className="auth-brand" href="#">
            <span className="auth-brand-mark"><GraduationCap size={29} /></span>
            <span>Campus<span>Connect</span></span>
          </a>

          <div className="auth-copy">
            <span className="auth-kicker">THE STUDENT NETWORK</span>
            <h1>তোমার ক্যাম্পাস।<br />তোমার মানুষ।<br /><em>একসাথে এগিয়ে যাও।</em></h1>
            <p>বিশ্ববিদ্যালয়ের শিক্ষার্থীদের জন্য একটি নিরাপদ ডিজিটাল কমিউনিটি—বন্ধুত্ব, ক্লাস গ্রুপ, একাডেমিক রিসোর্স ও ক্যাম্পাস আপডেট এক জায়গায়।</p>
            <div className="auth-feature-row">
              <span><Users size={18} /> ক্যাম্পাস কমিউনিটি</span>
              <span><ShieldCheck size={18} /> শিক্ষার্থী যাচাই</span>
              <span><BookOpen size={18} /> একাডেমিক রিসোর্স</span>
            </div>
          </div>

          <div className="auth-footer">© ২০২৬ CampusConnect · নিরাপদ শিক্ষার্থী নেটওয়ার্ক</div>
        </section>

        <section className="auth-panel-wrap">
          <div className="auth-panel">
            <div className="auth-panel-heading">
              <span className="auth-small-icon"><ShieldCheck size={21} /></span>
              <div>
                <h2>{authMode === "login" ? "আবার স্বাগতম!" : "CampusConnect-এ যোগ দাও"}</h2>
                <p>{authMode === "login" ? "তোমার অ্যাকাউন্টে লগইন করো।" : "তোমার তথ্য দিয়ে নতুন অ্যাকাউন্ট তৈরি করো।"}</p>
              </div>
            </div>

            {notice && <div className="auth-notice" role="status">{notice}</div>}

            {authMode === "signup" && <>
              <label>তোমার পূর্ণ নাম</label>
              <input className="field" value={fullName} onChange={e => setFullName(e.target.value)} placeholder="যেমন: তোমার পূর্ণ নাম" autoComplete="name" />

              <label>বিশ্ববিদ্যালয়ের নাম</label>
              <select className="field" value={selectedUni} onChange={e => setSelectedUni(e.target.value)}>
                <option value="">বিশ্ববিদ্যালয় নির্বাচন করো</option>
                {realUniversities.map(u => (
                  <option key={u.id} value={u.id}>{u.name}</option>
                ))}
              </select>

              <label>বিশ্ববিদ্যালয়ের ইমেইল</label>
              <input className="field" value={email} onChange={e => setEmail(e.target.value)} placeholder="name@university.edu" type="email" autoComplete="email" />

              <label>ফোন নম্বর</label>
              <input className="field" value={phone} onChange={e => setPhone(e.target.value)} placeholder="01XXXXXXXXX" type="tel" autoComplete="tel" />
            </>}

            {authMode === "login" && <>
              <label>ইমেইল</label>
              <input className="field" value={email} onChange={e => setEmail(e.target.value)} placeholder="তোমার নিবন্ধিত ইমেইল" type="email" autoComplete="email" />
            </>}

            <label>পাসওয়ার্ড</label>
            <input
              className="field"
              value={password}
              onChange={e => setPassword(e.target.value)}
              placeholder={authMode === "login" ? "তোমার পাসওয়ার্ড" : "কমপক্ষে ৮ অক্ষর"}
              type="password"
              autoComplete={authMode === "login" ? "current-password" : "new-password"}
              onKeyDown={e => {
                if (e.key === "Enter") {
                  authMode === "login" ? signIn() : signUp();
                }
              }}
            />

            <button className="primary-button full auth-submit" type="button" disabled={loading} onClick={authMode === "login" ? signIn : signUp}>
              {loading ? "অপেক্ষা করো..." : authMode === "login" ? "লগইন" : "অ্যাকাউন্ট তৈরি করো"}
            </button>

            {authMode === "login"
              ? <div className="auth-switch"><span>নতুন CampusConnect ব্যবহারকারী?</span><button type="button" onClick={() => { setAuthMode("signup"); setNotice(""); }}>অ্যাকাউন্ট তৈরি করো</button></div>
              : <div className="auth-switch"><span>আগে থেকেই অ্যাকাউন্ট আছে?</span><button type="button" onClick={() => { setAuthMode("login"); setNotice(""); }}>লগইন করো</button></div>
            }

            {authMode === "signup" && <p className="auth-legal">সাইন আপের পর তুমি সাধারণ কমিউনিটি দেখতে পারবে। ক্লাস গ্রুপ ও একাডেমিক সুবিধা পেতে স্টুডেন্ট আইডি কার্ড যাচাই সম্পন্ন করতে হবে।</p>}
          </div>

          <p className="auth-bottom-note">CampusConnect · তোমার ক্যাম্পাস, তোমার কমিউনিটি</p>
        </section>
      </main>
    );
  }

  return (
    <main className="shell">
      <header className="topbar">
        <a className="brand" href="#">
          <span className="brandmark"><GraduationCap size={23} /></span>
          <span>Campus<span className="brand-accent">Connect</span><small>Your campus, connected.</small></span>
        </a>

        <div className="top-search">
          <Search size={17} />
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="শিক্ষার্থী, পোস্ট বা বিশ্ববিদ্যালয় খুঁজুন" />
        </div>

        <div className="top-actions">
          <button className="icon-button" aria-label="Notifications" onClick={() => setNotice("নতুন নোটিফিকেশন এখনো নেই।")}>
            <Bell size={19} /><i />
          </button>

          <button className="profile-shortcut" title="আমার প্রোফাইল" aria-label="আমার প্রোফাইল খুলুন" onClick={() => setTab("profile")}>
            <span className="avatar">{profile?.full_name?.slice(0, 1) || "তু"}</span>
          </button>

          <button className="settings-shortcut" title="Settings" aria-label="Settings" onClick={() => setTab("settings")}><Settings size={20} /></button>
        </div>
      </header>

      <button className="mobile-menu-toggle" onClick={() => setMobileNav(!mobileNav)}>
        <Menu size={18} /> মেনু
      </button>

      <div className="layout">
        <aside className="left-sidebar">
          <div className="welcome-card">
            <div className="welcome-icon"><Users size={23} /></div>
            <h3>তোমার ক্যাম্পাস, তোমার কমিউনিটি</h3>
            <p>বিশ্ববিদ্যালয়ের বন্ধু, খবর ও সুযোগ—সব এক জায়গায়।</p>
            <span className="verified"><ShieldCheck size={14} /> Verified student community</span>
          </div>

          <nav className={`nav-menu ${mobileNav ? "nav-open" : ""}`}>
            <button className={tab === "feed" ? "active" : ""} onClick={() => { setTab("feed"); setMobileNav(false); }}><Users /> নিউজ ফিড</button>
            <button className={tab === "profile" ? "active" : ""} onClick={() => { setTab("profile"); setMobileNav(false); }}><UserRound /> আমার প্রোফাইল</button>

            {profile?.student_status === "verified" && <>
              <button className={tab === "universities" ? "active" : ""} onClick={() => { setTab("universities"); setMobileNav(false); }}><GraduationCap /> বিশ্ববিদ্যালয়</button>
              <button className={tab === "people" ? "active" : ""} onClick={() => { setTab("people"); setMobileNav(false); }}><UsersRound /> শিক্ষার্থী খুঁজুন</button>
              <button className={tab === "groups" ? "active" : ""} onClick={() => { setTab("groups"); setMobileNav(false); }}><Hash /> গ্রুপ ও কমিউনিটি</button>
              <button className={tab === "messages" ? "active" : ""} onClick={() => { setTab("messages"); setMobileNav(false); }}><MessageCircle /> মেসেজ</button>
              <button className={tab === "hub" ? "active" : ""} onClick={() => { setTab("hub"); setMobileNav(false); }}><BookOpen /> Academic Library</button>
              <button className={tab === "hub" ? "active" : ""} onClick={() => { setTab("hub"); setMobileNav(false); }}><UsersRound /> Communities</button>
            </>}

            <button className={tab === "settings" ? "active" : ""} onClick={() => { setTab("settings"); setMobileNav(false); }}><Settings /> Settings</button>

            {profile && ["super_admin", "university_admin", "moderator"].includes(profile.role) && (
              <button className={tab === "admin" ? "active" : ""} onClick={() => setTab("admin")}><ClipboardCheck /> যাচাইকরণ প্রশাসন</button>
            )}
          </nav>

          <div className="sidebar-note">
            <strong>নিরাপদ ক্যাম্পাস</strong>
            <p>যাচাইকৃত শিক্ষার্থীদের জন্য তৈরি কমিউনিটি।</p>
          </div>
        </aside>

        <section className="main-column">
          <div className="hero">
            <div>
              <span className="eyebrow">THE STUDENT NETWORK</span>
              <h1>একসাথে এগিয়ে যাই।</h1>
              <p>তোমার বিশ্ববিদ্যালয়ের মানুষের সঙ্গে যুক্ত হও, শিখো এবং সুযোগ তৈরি করো।</p>
            </div>
            <div className="hero-art">
              <div className="orbit orbit-one" />
              <div className="orbit orbit-two" />
              <GraduationCap size={66} />
            </div>
          </div>

          {notice && <div className="notice" role="status">{notice}<button onClick={() => setNotice("")}>×</button></div>}
          {profile?.student_status !== "verified" && <div className="cc-global-verification" role="status">
            <ShieldCheck size={18}/><div><strong>Verify your student account</strong><span>Complete student verification to unlock University Network, Communities and Academic Resources.</span></div>
            <button onClick={() => setTab("profile")}>Verify now</button>
          </div>}

          {tab === "hub" ? (profile ? <ExpansionHub profile={profile} /> : <div className="empty-state">Profile is loading…</div>) : tab === "feed" ? <>
            {user && profile && <section className="post-card">
              <div className="post-head">
                <div className="avatar">{(profile?.full_name || "তু").slice(0, 1)}</div>
                <div className="post-author">
                  <strong>{profile?.full_name || "তোমার অ্যাকাউন্ট"} {profile?.student_status === "verified" && <span className="verified-tick" title="যাচাইকৃত শিক্ষার্থী">✓</span>}</strong>
                  <span>{statusText[profile?.student_status || "pending"] || "অবস্থা পাওয়া যায়নি"}</span>
                </div>
                <span className="more"><Clock size={17} /></span>
              </div>

              {profile?.student_status !== "verified" ? <div className="verification-panel">
                <p>ক্লাস গ্রুপ, শিক্ষার্থী ডিরেক্টরি ও একাডেমিক সুবিধা পেতে বিশ্ববিদ্যালয়ের ইমেইল যাচাইয়ের প্রমাণ অথবা শিক্ষার্থী পরিচয়পত্র জমা দাও। সাধারণ ক্যাম্পাস ফিডে পোস্ট, লাইক ও মন্তব্য করতে পারবে। প্রশাসক পর্যালোচনা করে অনুমোদন দেবেন।</p>

                <button className="secondary-button full" disabled={loading} onClick={submitUniversityEmailProof}>বিশ্ববিদ্যালয়ের ইমেইল দিয়ে যাচাইয়ের আবেদন</button>

                <label>পরিচয়পত্রের ধরন</label>
                <select className="field" value={docType} onChange={e => setDocType(e.target.value)}>
                  <option value="student_id">শিক্ষার্থী পরিচয়পত্র</option>
                  <option value="enrollment_letter">ভর্তির / অধ্যয়নরত সনদ</option>
                  <option value="other">অন্যান্য প্রমাণ</option>
                </select>

                <label>ছবি অথবা PDF (সর্বোচ্চ ৫ MB)</label>
                <input className="field" type="file" accept=".jpg,.jpeg,.png,.pdf,image/jpeg,image/png,application/pdf" onChange={e => setDocFile(e.target.files?.[0] || null)} />

                <button className="primary-button full" disabled={loading || !docFile} onClick={submitDocument}>
                  <Upload size={16} /> পরিচয়পত্র জমা দাও
                </button>

                <small className="privacy">তোমার নথি ব্যক্তিগত Storage-এ থাকবে; শুধু অনুমোদিত প্রশাসক দেখতে পারবেন।</small>
              </div> : <p>তোমার শিক্ষার্থী পরিচয় যাচাই সম্পন্ন। ক্লাস গ্রুপ ও একাডেমিক সুবিধা ব্যবহার করতে পারবে।</p>}
            </section>}

            <div className="section-heading cc-feed-heading">
              <div><h2>ক্যাম্পাস ফিড</h2><p>তোমার কমিউনিটির সাম্প্রতিক আলোচনা</p></div>
              <span className="cc-live-label"><i /> CAMPUS LIVE</span>
            </div>

            <section className="cc-campus-strip" aria-label="Campus shortcuts">
              <button className="cc-moment-card cc-moment-primary" onClick={() => setTab("people")}>
                <span className="cc-moment-icon"><UsersRound size={21}/></span>
                <span><strong>People</strong><small>শিক্ষার্থী খুঁজুন</small></span>
                <span className="cc-moment-arrow">↗</span>
              </button>
              <button className="cc-moment-card cc-moment-groups" onClick={() => setTab("groups")}>
                <span className="cc-moment-icon"><Hash size={21}/></span>
                <span><strong>Campus circles</strong><small>গ্রুপ ও আলোচনা</small></span>
                <span className="cc-moment-arrow">↗</span>
              </button>
              <button className="cc-moment-card cc-moment-library" onClick={() => setTab("hub")}>
                <span className="cc-moment-icon"><BookOpen size={21}/></span>
                <span><strong>Study space</strong><small>Academic Library</small></span>
                <span className="cc-moment-arrow">↗</span>
              </button>
            </section>

            {user && <div className="composer">
              <div className="composer-top">
                <div className="avatar avatar-blue">{profile?.full_name?.slice(0, 1) || "তু"}</div>
                <textarea value={content} onChange={e => setContent(e.target.value)} placeholder="ক্যাম্পাসে কী ঘটছে? বন্ধুদের সঙ্গে শেয়ার করো..." />
              </div>
              <div className="composer-bottom">
                <span><ImagePlus size={17} /> এখন টেক্সট পোস্ট করা যাবে</span>
                <button className="primary-button" onClick={createPost} disabled={loading}><Plus size={17} /> পোস্ট করুন</button>
              </div>
            </div>}

            {visiblePosts.length === 0
              ? <article className="post-card empty-state">
                  <Users size={30} />
                  <strong>{search.trim() ? "কোনো মিল পাওয়া যায়নি" : "এখনো কোনো পোস্ট নেই"}</strong>
                  <span>{search.trim() ? "অন্য শব্দ দিয়ে খুঁজে দেখো।" : "তোমার ক্যাম্পাসের প্রথম পোস্টটি তুমি শেয়ার করতে পারো।"}</span>
                </article>
              : visiblePosts.map(p => {
                const author = postAuthors[p.author_id];

                return <article className="post-card" key={p.id}>
                  <div className="post-head">
                    <div className="avatar">{author?.full_name?.slice(0, 1) || "CC"}</div>
                    <div className="post-author">
                      <strong>{author?.full_name || "CampusConnect শিক্ষার্থী"} {author?.student_status === "verified" && <span className="verified-tick" title="যাচাইকৃত শিক্ষার্থী">✓</span>}</strong>
                      <span>{new Date(p.created_at).toLocaleString(language === "bn" ? "bn-BD" : "en-US")} · {author?.student_status === "verified" ? "যাচাইকৃত শিক্ষার্থী" : "CampusConnect সদস্য"}</span>
                    </div>
                    <button className="quiet-icon" aria-label="পোস্টের বিকল্প" onClick={() => setNotice("পোস্ট রিপোর্ট বা সংরক্ষণের সুবিধা পরবর্তী ধাপে যুক্ত হবে।")}><MoreHorizontal size={20} /></button>
                  </div>

                  <p className="post-content">{p.content}</p>

                  <div className="post-stats">
                    <span><ThumbsUp size={14} /> {likeCounts[p.id] || 0} জন পছন্দ করেছেন</span>
                    <button onClick={() => { setOpenComments(openComments === p.id ? null : p.id); if (openComments !== p.id) void loadComments(p.id); }}>{commentCounts[p.id] || 0} মন্তব্য</button>
                  </div>

                  <div className="post-actions">
                    <button className={likedPosts.includes(p.id) ? "liked" : ""} onClick={() => toggleLike(p.id)}><ThumbsUp size={18} /> {likedPosts.includes(p.id) ? "পছন্দ করেছেন" : "ভালো লাগল"}</button>
                    <button onClick={() => { setOpenComments(openComments === p.id ? null : p.id); if (openComments !== p.id) void loadComments(p.id); }}><MessageCircle size={18} /> মন্তব্য</button>
                    <button onClick={() => sharePost(p.id, p.content)}><Share2 size={17} /> শেয়ার</button>
                  </div>

                  {openComments === p.id && <div className="post-comments">
                    {commentsLoading === p.id
                      ? <p className="privacy">মন্তব্য লোড হচ্ছে...</p>
                      : (postComments[p.id] || []).map(comment => <div className="comment-row" key={comment.id}>
                          <div className="avatar avatar-small">{comment.author_name?.slice(0, 1) || "C"}</div>
                          <div className="comment-bubble">
                            <strong>{comment.author_name || "CampusConnect সদস্য"}</strong>
                            <p>{comment.content}</p>
                            <small>{new Date(comment.created_at).toLocaleString(language === "bn" ? "bn-BD" : "en-US")}</small>
                          </div>
                        </div>)
                    }

                    <div className="comment-compose">
                      <input value={commentDrafts[p.id] || ""} onChange={e => setCommentDrafts(old => ({ ...old, [p.id]: e.target.value }))} placeholder="একটি মন্তব্য লিখুন..." onKeyDown={e => e.key === "Enter" && addComment(p.id)} />
                      <button aria-label="মন্তব্য পাঠান" onClick={() => addComment(p.id)}><Send size={16} /></button>
                    </div>
                  </div>}
                </article>;
              })
            }
          </> : tab === "universities" ? (profile?.student_status === "verified" ? <>
            <div className="section-heading">
              <div><h2>বিশ্ববিদ্যালয়সমূহ</h2><p>তোমার ক্যাম্পাস খুঁজে নাও</p></div>
            </div>
            <div className="university-grid">
              {visibleUniversities.map(u => <div className="university-card" key={u.id}>
                <div className="uni-icon"><GraduationCap /></div>
                <strong>{u.name}</strong>
                <span>{u.short_name}</span>
                <small>{u.domain || "ডোমেইন যাচাই প্রয়োজন"}</small>
              </div>)}
            </div>
          </> : <div className="cc-global-verification"><ShieldCheck size={18}/><div><strong>Student verification required</strong><span>Verify your student account to access the university directory.</span></div><button onClick={() => setTab("profile")}>Verify now</button></div>) : tab === "profile" ? <>
            <div className="profile-cover">
              <div className="profile-big-avatar">{profile?.full_name?.slice(0, 1) || "তু"}</div>
              <div>
                <h2>{profile?.full_name || "তোমার প্রোফাইল"} {profile?.student_status === "verified" && <span className="verified-tick">✓</span>}</h2>
                <p>{statusText[profile?.student_status || "pending"]}</p>
                {profile?.student_status !== "verified" && <small className="cc-profile-verification">Your student account is not verified yet. Submit your student details for review to unlock the University Directory, student search, communities and Academic Library.</small>}
              </div>
            </div>

            <article className="post-card profile-details">
              <div className="section-heading">
                <div><h2>ব্যক্তিগত তথ্য</h2><p>তোমার প্রোফাইল তথ্য হালনাগাদ করো</p></div>
                <button
                  className="secondary-button"
                  onClick={() => {
                    setEditName(profile?.full_name || "");
                    setEditDepartment(profile?.department || "");
                    setEditBatch(profile?.batch || "");
                    setEditUniversity(profile?.university_id || "");
                    setProfileEditing(!profileEditing);
                    setNotice("");
                  }}
                >
                  <Pencil size={15} /> {profileEditing ? "বন্ধ করো" : "সম্পাদনা"}
                </button>
              </div>

              {profileEditing
                ? <>
                    <label>পূর্ণ নাম</label>
                    <input className="field" value={editName} onChange={e => setEditName(e.target.value)} />

                    <label>বিশ্ববিদ্যালয়</label>
                    <select
                      className="field"
                      value={editUniversity}
                      onChange={e => setEditUniversity(e.target.value)}
                    >
                      <option value="">বিশ্ববিদ্যালয় নির্বাচন করুন</option>
                      {realUniversities.map(u => (
                        <option key={u.id} value={u.id}>
                          {u.name}
                        </option>
                      ))}
                    </select>

                    {realUniversities.length === 0 && (
                      <small className="privacy">
                        বিশ্ববিদ্যালয়ের তালিকা পাওয়া যাচ্ছে না। পরে আবার চেষ্টা করুন অথবা প্রশাসকের সঙ্গে যোগাযোগ করুন।
                      </small>
                    )}

                    <label>বিভাগ</label>
                    <input className="field" value={editDepartment} onChange={e => setEditDepartment(e.target.value)} placeholder="যেমন: কম্পিউটার বিজ্ঞান" />

                    <label>ব্যাচ</label>
                    <input className="field" value={editBatch} onChange={e => setEditBatch(e.target.value)} placeholder="যেমন: ২০২২-২৩" />

                    <button
                      className="primary-button full"
                      onClick={saveProfile}
                      disabled={loading || realUniversities.length === 0}
                    >
                      {loading ? "সংরক্ষণ হচ্ছে..." : "পরিবর্তন সংরক্ষণ"}
                    </button>
                  </>
                : <div className="profile-info-grid">
                    <div><small>নাম</small><strong>{profile?.full_name || "তথ্য নেই"}</strong></div>
                    <div><small>ইমেইল</small><strong>{user?.email}</strong></div>
                    <div>
                      <small>বিশ্ববিদ্যালয়</small>
                      <strong>
                        {universities.find(u => u.id === profile?.university_id)?.name || "বিশ্ববিদ্যালয় যুক্ত করা হয়নি"}
                      </strong>
                    </div>
                    <div><small>বিভাগ</small><strong>{profile?.department || "যোগ করা হয়নি"}</strong></div>
                    <div><small>ব্যাচ</small><strong>{profile?.batch || "যোগ করা হয়নি"}</strong></div>
                    <div><small>যাচাইকরণ</small><strong>{statusText[profile?.student_status || "pending"]}</strong></div>
                  </div>
              }
            </article>
          </> : tab === "people" ? <>
            <div className="section-heading">
              <div><h2>শিক্ষার্থী খুঁজুন</h2><p>তোমার বিশ্ববিদ্যালয়ের যাচাইকৃত শিক্ষার্থীদের সঙ্গে যুক্ত হও</p></div>
            </div>

            <div className="people-list">
              {people.map(person => <div className="person-row" key={person.id}>
                <div className="avatar">{person.full_name.slice(0, 1)}</div>
                <div className="post-author">
                  <strong>{person.full_name} <span className="verified-tick">✓</span></strong>
                  <span>যাচাইকৃত শিক্ষার্থী</span>
                </div>
                <button className="secondary-button" onClick={() => { setTab("messages"); startDirectMessage(person); }}><MessageCircle size={15} /> মেসেজ</button>
              </div>)}

              {people.length === 0 && <article className="post-card">এখনো কোনো শিক্ষার্থী পাওয়া যায়নি।</article>}
            </div>
          </> : tab === "groups" ? <>
            <div className="section-heading">
              <div><h2>গ্রুপ ও কমিউনিটি</h2><p>ক্লাস, বিভাগ ও আগ্রহভিত্তিক গ্রুপ তৈরি করো</p></div>
            </div>

            <div className="post-card create-group">
              <h3><PlusCircle size={18} /> নতুন গ্রুপ তৈরি</h3>
              <input className="field" value={groupName} onChange={e => setGroupName(e.target.value)} placeholder="গ্রুপের নাম" />
              <input className="field" value={groupDescription} onChange={e => setGroupDescription(e.target.value)} placeholder="গ্রুপ সম্পর্কে সংক্ষেপে লিখো" />
              <button className="primary-button" onClick={createGroup} disabled={loading}><Plus size={16} /> গ্রুপ তৈরি করো</button>
            </div>

            <div className="group-layout">
              <div className="group-list">
                {groups.map(g => <div className={`group-item ${activeGroup?.id === g.id ? "selected" : ""}`} key={g.id}>
                  <button onClick={() => openGroup(g)}>
                    <span className="group-avatar"><UsersRound /></span>
                    <span><strong>{g.name}</strong><small>{g.description || "ক্যাম্পাস কমিউনিটি গ্রুপ"}</small></span>
                  </button>
                  <button className="join-group" onClick={() => joinGroup(g)}>যোগ দাও</button>
                </div>)}

                {groups.length === 0 && <p className="empty-state">এখনো কোনো গ্রুপ তৈরি হয়নি। প্রথম গ্রুপটি তৈরি করো।</p>}
              </div>

              {activeGroup && <div className="group-chat">
                <h3>{activeGroup.name}</h3>
                <div className="chat-stream">
                  {groupMessages.map(m => <div className={`chat-bubble ${m.sender_id === user?.id ? "mine" : ""}`} key={m.id}>
                    {m.content}
                    <small>{new Date(m.created_at).toLocaleTimeString(language === "bn" ? "bn-BD" : "en-US", { hour: "2-digit", minute: "2-digit" })}</small>
                  </div>)}
                </div>
                <div className="chat-compose">
                  <input value={groupDraft} onChange={e => setGroupDraft(e.target.value)} placeholder="গ্রুপে মেসেজ লিখো..." onKeyDown={e => e.key === "Enter" && sendGroupMessage()} />
                  <button onClick={sendGroupMessage}><SendHorizontal /></button>
                </div>
              </div>}
            </div>
          </> : tab === "messages" ? <>
            <div className="section-heading">
              <div><h2>মেসেজ</h2><p>তোমার বিশ্ববিদ্যালয়ের শিক্ষার্থীদের সঙ্গে ব্যক্তিগত কথোপকথন</p></div>
            </div>

            <div className="messenger-layout">
              <div className="messenger-people">
                <h3>নতুন কথোপকথন</h3>
                {people.map(person => <button className={`person-row ${activePerson?.id === person.id ? "selected" : ""}`} key={person.id} onClick={() => startDirectMessage(person)}>
                  <div className="avatar">{person.full_name.slice(0, 1)}</div>
                  <span><strong>{person.full_name}</strong><small>যাচাইকৃত শিক্ষার্থী</small></span>
                </button>)}
              </div>

              <div className="messenger-chat">
                {activePerson
                  ? <>
                      <h3>{activePerson.full_name}</h3>
                      <div className="chat-stream">
                        {dmMessages.map(m => <div className={`chat-bubble ${m.sender_id === user?.id ? "mine" : ""}`} key={m.id}>{m.content}</div>)}
                      </div>
                      <div className="chat-compose">
                        <input value={dmDraft} onChange={e => setDmDraft(e.target.value)} placeholder="মেসেজ লিখুন..." onKeyDown={e => e.key === "Enter" && sendDirectMessage()} />
                        <button onClick={sendDirectMessage}><SendHorizontal /></button>
                      </div>
                    </>
                  : <div className="empty-state">
                      <MessageCircle size={30} />
                      <strong>কথোপকথন শুরু করো</strong>
                      <span>বাম পাশ থেকে একজন শিক্ষার্থী নির্বাচন করো।</span>
                    </div>
                }
              </div>
            </div>
          </> : tab === "admin" ? <>
            <div className="section-heading">
              <div><h2>শিক্ষার্থী যাচাইকরণ</h2><p>নতুন আবেদন পর্যালোচনা ও সিদ্ধান্ত নাও</p></div>
              <button className="secondary-button" onClick={loadApplications}><RefreshCw size={15} /> হালনাগাদ</button>
            </div>

            {applications.length === 0
              ? <article className="post-card">এ মুহূর্তে অপেক্ষমাণ আবেদন নেই।</article>
              : applications.map(a => <article className="post-card" key={a.id}>
                  <div className="post-head">
                    <div className="avatar"><FileText /></div>
                    <div className="post-author">
                      <strong>{a.student?.full_name || "শিক্ষার্থী"}</strong>
                      <span>
                        {a.document_type} · {new Date(a.created_at).toLocaleString(language === "bn" ? "bn-BD" : "en-US")}
                      </span>
                      <small>
                        {universities.find(u => u.id === a.student?.university_id)?.name || "বিশ্ববিদ্যালয়ের তথ্য পাওয়া যায়নি"}
                      </small>
                    </div>
                  </div>
                  <div className="post-actions">
                    <button onClick={() => openDocument(a.storage_path, a.document_type)}><FileText size={17} /> প্রমাণ দেখুন</button>
                    <button disabled={reviewBusy === a.id} onClick={() => reviewApplication(a.id, "approved")}><CheckCircle2 size={17} /> অনুমোদন</button>
                    <button disabled={reviewBusy === a.id} onClick={() => reviewApplication(a.id, "rejected")}><XCircle size={17} /> বাতিল</button>
                  </div>
                </article>)
            }
          </> : tab === "settings" ? <>
            <div className="section-heading"><div><h2>Settings</h2><p>Manage your language, appearance and account preferences.</p></div></div>
            <div className="settings-page">
              <section className="settings-card">
                <div className="settings-card-icon"><Languages size={21}/></div>
                <div className="settings-card-copy"><h3>Language</h3><p>Choose the language used across CampusConnect.</p></div>
                <div className="settings-control"><button className={language === "en" ? "selected" : ""} onClick={() => setLanguage("en")}>English</button><button className={language === "bn" ? "selected" : ""} onClick={() => setLanguage("bn")}>বাংলা</button></div>
              </section>
              <section className="settings-card">
                <div className="settings-card-icon"><Sun size={21}/></div>
                <div className="settings-card-copy"><h3>Appearance</h3><p>Choose light, dark or follow your device setting.</p></div>
                <div className="settings-control theme-control"><button className={theme === "light" ? "selected" : ""} onClick={() => setTheme("light")}><Sun size={15}/> Light</button><button className={theme === "dark" ? "selected" : ""} onClick={() => setTheme("dark")}><Moon size={15}/> Dark</button><button className={theme === "system" ? "selected" : ""} onClick={() => setTheme("system")}>System</button></div>
              </section>
              <section className="settings-card account-settings-card">
                <div className="settings-card-icon"><Settings size={21}/></div>
                <div className="settings-card-copy"><h3>Account</h3><p>{profile?.full_name || user?.email} · {statusText[profile?.student_status || "pending"]}</p><small>Your sign-in session and account access are managed securely.</small></div>
                <button className="settings-logout" onClick={signOut}><LogOut size={17}/> Log out</button>
              </section>
            </div>
          </> : null}
        </section>

        <aside className="right-sidebar">
          <section className="account-card" id="account">
            <div className="account-title"><ShieldCheck size={20} /><h3>{user ? "তোমার অ্যাকাউন্ট" : "কমিউনিটিতে যোগ দাও"}</h3></div>

            {user
              ? <>
                  <p>{profile?.full_name || user.email}</p>
                  <p>{statusText[profile?.student_status || "pending"]}</p>
                  <button className="secondary-button full" onClick={() => setTab("settings")}><Settings size={15} /> Account settings</button>
                </>
              : <>
                  <p>{authMode === "login" ? "আগের অ্যাকাউন্টে প্রবেশ করতে ইমেইল ও পাসওয়ার্ড লিখুন।" : "বিশ্ববিদ্যালয়ের ইমেইল অথবা শিক্ষার্থী পরিচয়পত্রের মাধ্যমে যাচাইয়ের প্রক্রিয়া শুরু করো।"}</p>

                  {authMode === "signup" && <>
                    <label>পূর্ণ নাম</label>
                    <input className="field" value={fullName} onChange={e => setFullName(e.target.value)} placeholder="তোমার নাম" />
                    <label>বিশ্ববিদ্যালয়</label>
                    <select className="field" value={selectedUni} onChange={e => setSelectedUni(e.target.value)}>
                      <option value="">বিশ্ববিদ্যালয় নির্বাচন</option>
                      {realUniversities.map(u => <option key={u.id} value={u.id}>{u.name}</option>)}
                    </select>
                  </>}

                  <label>বিশ্ববিদ্যালয়ের ইমেইল</label>
                  <input className="field" value={email} onChange={e => setEmail(e.target.value)} placeholder="name@university.edu" type="email" autoComplete="email" />

                  <label>পাসওয়ার্ড</label>
                  <input
                    className="field"
                    value={password}
                    onChange={e => setPassword(e.target.value)}
                    placeholder={authMode === "login" ? "তোমার পাসওয়ার্ড" : "কমপক্ষে ৮ অক্ষর"}
                    type="password"
                    autoComplete={authMode === "login" ? "current-password" : "new-password"}
                    onKeyDown={e => {
                      if (e.key === "Enter") {
                        authMode === "login" ? signIn() : signUp();
                      }
                    }}
                  />

                  {authMode === "login"
                    ? <button className="primary-button full" type="button" disabled={loading} onClick={signIn}>{loading ? "লগইন হচ্ছে..." : "লগইন করুন"}</button>
                    : <button className="primary-button full" type="button" disabled={loading} onClick={signUp}>{loading ? "অ্যাকাউন্ট তৈরি হচ্ছে..." : "অ্যাকাউন্ট তৈরি করুন"}</button>
                  }

                  <button className="secondary-button full" type="button" disabled={loading} onClick={() => { setAuthMode(authMode === "login" ? "signup" : "login"); setNotice(""); }}>
                    {authMode === "login" ? "নতুন অ্যাকাউন্ট তৈরি করুন" : "আগে অ্যাকাউন্ট থাকলে লগইন"}
                  </button>

                  <small className="privacy">
                    {authMode === "login"
                      ? "ইমেইল যাচাই করা থাকলে আগের অ্যাকাউন্ট দিয়েই প্রবেশ করতে পারবে।"
                      : "নিবন্ধনের পর ইমেইল যাচাই এবং শিক্ষার্থী পরিচয় যাচাই সম্পন্ন করতে হবে."
                    }
                  </small>
                </>
            }
          </section>

          <section className="side-widget">
            <h3>কমিউনিটি নীতিমালা</h3>
            <p>সম্মানজনক আলোচনা, সঠিক তথ্য এবং নিরাপদ ক্যাম্পাস সংস্কৃতি বজায় রাখো।</p>
            <a href="mailto:support@campusconnect.example">সহায়তা ও যোগাযোগ</a>
          </section>

          <div className="footer-links">
            গোপনীয়তা · শর্তাবলি · নিরাপত্তা<br />
            © 2026 CampusConnect
          </div>
        </aside>
      </div>

      {/* প্রমাণ দেখানোর Modal */}
      {evidenceOpen && (
        <div
          role="presentation"
          onClick={closeEvidence}
          style={{
            position: "fixed",
            inset: 0,
            zIndex: 9999,
            background: "rgba(10, 18, 35, 0.78)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: "16px"
          }}
        >
          <section
            role="dialog"
            aria-modal="true"
            aria-label="শিক্ষার্থীর জমা দেওয়া প্রমাণ"
            onClick={e => e.stopPropagation()}
            style={{
              width: "min(960px, 100%)",
              height: "min(90vh, 850px)",
              background: "#ffffff",
              color: "#172033",
              borderRadius: "16px",
              overflow: "hidden",
              display: "flex",
              flexDirection: "column",
              boxShadow: "0 20px 70px rgba(0,0,0,.35)"
            }}
          >
            <header
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                gap: "12px",
                padding: "15px 18px",
                borderBottom: "1px solid #e5e7eb",
                flexShrink: 0
              }}
            >
              <div style={{ minWidth: 0 }}>
                <strong style={{ display: "block", fontSize: "16px" }}>
                  জমা দেওয়া প্রমাণ
                </strong>
                <small style={{ color: "#64748b" }}>
                  {evidenceName}
                </small>
              </div>

              <button
                type="button"
                onClick={closeEvidence}
                aria-label="প্রমাণ বন্ধ করুন"
                style={{
                  border: 0,
                  borderRadius: "9px",
                  background: "#f1f5f9",
                  color: "#172033",
                  width: "38px",
                  height: "38px",
                  cursor: "pointer",
                  display: "grid",
                  placeItems: "center",
                  flexShrink: 0
                }}
              >
                <X size={21} />
              </button>
            </header>

            <div
              style={{
                flex: 1,
                minHeight: 0,
                overflow: "auto",
                background: "#f1f5f9",
                display: "flex",
                alignItems: evidenceType === "image" ? "center" : "stretch",
                justifyContent: "center",
                padding: "12px"
              }}
            >
              {evidenceLoading ? (
                <div style={{ margin: "auto", textAlign: "center", color: "#475569" }}>
                  <RefreshCw size={30} />
                  <p>প্রমাণ লোড হচ্ছে...</p>
                </div>
              ) : evidenceType === "email" ? (
                <div
                  style={{
                    margin: "auto",
                    width: "min(560px, 100%)",
                    background: "#ffffff",
                    borderRadius: "12px",
                    padding: "28px",
                    textAlign: "center",
                    boxShadow: "0 4px 18px rgba(15,23,42,.08)"
                  }}
                >
                  <ShieldCheck size={42} color="#16845b" />
                  <h3 style={{ margin: "12px 0 8px" }}>
                    বিশ্ববিদ্যালয়ের ইমেইল প্রমাণ
                  </h3>
                  <p style={{ color: "#64748b", marginBottom: "8px" }}>
                    আবেদনকারীর জমা দেওয়া ইমেইল ঠিকানা:
                  </p>
                  <strong
                    style={{
                      display: "block",
                      padding: "14px",
                      background: "#f1f5f9",
                      borderRadius: "8px",
                      overflowWrap: "anywhere"
                    }}
                  >
                    {evidenceText}
                  </strong>
                  <small style={{ display: "block", marginTop: "14px", color: "#64748b" }}>
                    এই আবেদনটি ইমেইল যাচাইয়ের মাধ্যমে জমা হয়েছে; এখানে আলাদা ছবি বা PDF নেই।
                  </small>
                </div>
              ) : evidenceType === "image" && evidenceUrl ? (
                <img
                  src={evidenceUrl}
                  alt="শিক্ষার্থীর জমা দেওয়া পরিচয়পত্র"
                  style={{
                    display: "block",
                    maxWidth: "100%",
                    maxHeight: "100%",
                    objectFit: "contain",
                    margin: "auto",
                    borderRadius: "8px"
                  }}
                />
              ) : evidenceType === "pdf" && evidenceUrl ? (
                <iframe
                  src={evidenceUrl}
                  title="শিক্ষার্থীর জমা দেওয়া PDF প্রমাণ"
                  style={{
                    width: "100%",
                    height: "100%",
                    minHeight: "500px",
                    border: 0,
                    background: "#ffffff",
                    borderRadius: "8px"
                  }}
                />
              ) : evidenceUrl ? (
                <div style={{ margin: "auto", textAlign: "center", padding: "24px" }}>
                  <FileText size={42} />
                  <h3>এই ফাইলটি সরাসরি দেখানো যাচ্ছে না</h3>
                  <p>নিচের বাটনে ক্লিক করে ফাইলটি খোলার চেষ্টা করো।</p>
                  <a
                    href={evidenceUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    style={{
                      display: "inline-block",
                      padding: "11px 18px",
                      background: "#1d4ed8",
                      color: "#ffffff",
                      borderRadius: "8px",
                      textDecoration: "none"
                    }}
                  >
                    ফাইল খুলুন
                  </a>
                </div>
              ) : (
                <div style={{ margin: "auto", textAlign: "center", color: "#64748b" }}>
                  <FileText size={36} />
                  <p>প্রমাণ প্রদর্শন করা যাচ্ছে না। উপরের বার্তাটি দেখুন।</p>
                </div>
              )}
            </div>

            <footer
              style={{
                padding: "12px 18px",
                borderTop: "1px solid #e5e7eb",
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                gap: "10px",
                flexShrink: 0
              }}
            >
              <small style={{ color: "#64748b" }}>
                নিরাপত্তার জন্য এই প্রমাণের লিংক ৫ মিনিট পর মেয়াদোত্তীর্ণ হবে।
              </small>
              <button
                type="button"
                onClick={closeEvidence}
                style={{
                  border: 0,
                  borderRadius: "8px",
                  padding: "10px 18px",
                  background: "#172033",
                  color: "#ffffff",
                  cursor: "pointer"
                }}
              >
                বন্ধ করুন
              </button>
            </footer>
          </section>
        </div>
      )}
    </main>
  );
}
