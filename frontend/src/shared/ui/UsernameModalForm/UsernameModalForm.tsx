import { ChangeEvent, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { getRouteGame } from "@/shared/const/router";
import { Button, HStack } from "@/shared/ui";
import { useCreateAnonymousUserMutation } from "../../../features/Auth/model/services/authService.ts";
import { Modal } from "@/shared/ui/Modal/Modal";
import cls from "./Auth.module.scss";

export const UsernameModalForm = () => {
  const [username, setUsername] = useState("");
  const [isValid, setIsValid] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);

  const [createAnonymousUser] = useCreateAnonymousUserMutation();
  const navigate = useNavigate();
  const inputRef = useRef<HTMLInputElement | null>(null);

  const handleChange = (e: ChangeEvent<HTMLInputElement>) => {
    setUsername(e.target.value);
    setIsValid(e.target.value.length >= 4);
  };

  const handleSubmit = async () => {
    if (!username) return;

    try {
      await createAnonymousUser({ username }).unwrap();
      navigate(getRouteGame());
    } catch (err: any) {
      if (err?.data?.errorCode === "already_exists") {
        setIsModalOpen(true);
      } else {
        console.error("Неизвестная ошибка:", err);
      }
    }
  };

  return (
    <>
      {/* Форма ввода */}
      {!isModalOpen && (
        <div className={cls.modal}>
          <HStack className={cls.inputWrapper} max>
            <input
              className={cls.input}
              placeholder="Введите имя"
              value={username}
              onChange={handleChange}
              ref={inputRef}
            />
            {isValid && (
              <Button className={cls.goToGame} onClick={handleSubmit}>
                В игру
              </Button>
            )}
            {!isValid && username && (
              <span className={cls.error}>Минимум 4 символа.</span>
            )}
          </HStack>
        </div>
      )}

      {/* Модалка ошибки */}
      <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)}>
        <h2>Ошибка</h2>
        <p>Пользователь с таким ником уже существует</p>
        <Button
          onClick={() => {
            setIsModalOpen(false);
            setUsername("");
            setIsValid(false);
          }}
        >
          Закрыть
        </Button>
      </Modal>
    </>
  );
};

export default UsernameModalForm;
