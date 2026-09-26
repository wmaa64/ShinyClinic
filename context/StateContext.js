import React, { createContext, useContext, useState, useEffect } from "react";
import { toast } from "react-hot-toast";
import { useRouter } from "next/router"

const Context = createContext();

export const StateContext = ({ children }) => {
    const [userInfo, setUserInfo] = useState(null);

    const router = useRouter();

    // Load from localStorage at startup
    useEffect(() => {
        const storedUser = localStorage.getItem("userInfo");
        if (storedUser) setUserInfo(JSON.parse(storedUser));
    }, []);

    // Save to localStorage whenever userInfo changes
    useEffect(() => {
        if (userInfo) localStorage.setItem("userInfo", JSON.stringify(userInfo));
        else localStorage.removeItem("userInfo");
    }, [userInfo]);

    // =========================
    // Login
    // =========================
    const loginUser = (user) => {
        const loggedInUser = {
            UserID: user.UserID,
            UserName: user.UserName,
            FullName: user.FullName,
            RoleID: user.RoleID,
        };

        setUserInfo(loggedInUser);

        localStorage.setItem("userInfo", JSON.stringify(loggedInUser)

        );
    };

    // Logout function
    const logoutUser = () => {
        setUserInfo(null);
        localStorage.removeItem("userInfo");
        toast.success("Logged out successfully!");
        router.push("/")
    };
    
return (
    <Context.Provider
        value={{userInfo, setUserInfo, loginUser, logoutUser, }}
    >
        {children}
    </Context.Provider>
);
};

export const useStateContext = () => useContext(Context);    
